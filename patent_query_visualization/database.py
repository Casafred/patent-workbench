"""
专利查询可视化功能的数据库模式和操作

定义了数据库表结构和基础数据库操作。
"""

import json
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor
from backend.extensions import get_db_pool
from .models import (
    PatentDetails, ClaimsTreeData, ColumnConfiguration, 
    PatentSearchResult, ClaimNode, ValidationResult,
    DataStorageInterface, ConfigurationServiceInterface,
    PatentQueryError, ConfigurationError, DataStorageError
)

logger = logging.getLogger(__name__)


class DatabaseManager:
    """数据库管理器"""
    
    @staticmethod
    def create_tables():
        """创建数据库表"""
        db_pool = get_db_pool()
        if not db_pool:
            logger.warning("数据库连接池未初始化，跳过表创建")
            return False
        
        conn = None
        try:
            conn = db_pool.getconn()
            cursor = conn.cursor()
            
            # 创建专利表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS patents (
                    id SERIAL PRIMARY KEY,
                    patent_number VARCHAR(50) UNIQUE NOT NULL,
                    title TEXT NOT NULL,
                    applicant VARCHAR(255),
                    filing_date DATE,
                    publication_date DATE,
                    abstract TEXT,
                    inventors JSONB DEFAULT '[]',
                    assignees JSONB DEFAULT '[]',
                    raw_claims_text TEXT,
                    description TEXT,
                    url VARCHAR(500),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            
            # 创建权利要求表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS claims (
                    id SERIAL PRIMARY KEY,
                    patent_id INTEGER REFERENCES patents(id) ON DELETE CASCADE,
                    claim_number INTEGER NOT NULL,
                    claim_text TEXT NOT NULL,
                    claim_type VARCHAR(20) NOT NULL CHECK (claim_type IN ('independent', 'dependent')),
                    dependencies INTEGER[] DEFAULT '{}',
                    level INTEGER DEFAULT 0,
                    confidence_score FLOAT DEFAULT 1.0,
                    language VARCHAR(10) DEFAULT 'zh',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(patent_id, claim_number)
                );
            """)
            
            # 创建权利要求树数据表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS claims_trees (
                    id SERIAL PRIMARY KEY,
                    patent_number VARCHAR(50) UNIQUE NOT NULL,
                    tree_data JSONB NOT NULL,
                    metadata JSONB DEFAULT '{}',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            
            # 创建配置表
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS patent_query_configuration (
                    id SERIAL PRIMARY KEY,
                    config_key VARCHAR(100) UNIQUE NOT NULL,
                    config_value JSONB NOT NULL,
                    description TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            
            # 创建索引
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_patents_number ON patents(patent_number);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_patents_applicant ON patents(applicant);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_patents_filing_date ON patents(filing_date);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_patents_title ON patents USING gin(to_tsvector('english', title));")
            
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_claims_patent_id ON claims(patent_id);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_claims_number ON claims(claim_number);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_claims_type ON claims(claim_type);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_claims_level ON claims(level);")
            
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_claims_trees_patent_number ON claims_trees(patent_number);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_config_key ON patent_query_configuration(config_key);")
            
            conn.commit()
            logger.info("数据库表创建成功")
            return True
            
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"创建数据库表失败: {e}")
            raise DataStorageError(f"创建数据库表失败: {e}")
        finally:
            if conn:
                db_pool.putconn(conn)


class PatentDataStorage(DataStorageInterface):
    """专利数据存储实现"""
    
    def __init__(self):
        self.db_pool = get_db_pool()
        if not self.db_pool:
            logger.warning("数据库连接池未初始化")
    
    def store_patent_data(self, patent: PatentDetails) -> bool:
        """存储专利数据"""
        if not self.db_pool:
            return False
        
        conn = None
        try:
            conn = self.db_pool.getconn()
            cursor = conn.cursor()
            
            # 插入或更新专利基本信息
            cursor.execute("""
                INSERT INTO patents (
                    patent_number, title, applicant, filing_date, publication_date,
                    abstract, inventors, assignees, raw_claims_text, description, url
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (patent_number) DO UPDATE SET
                    title = EXCLUDED.title,
                    applicant = EXCLUDED.applicant,
                    filing_date = EXCLUDED.filing_date,
                    publication_date = EXCLUDED.publication_date,
                    abstract = EXCLUDED.abstract,
                    inventors = EXCLUDED.inventors,
                    assignees = EXCLUDED.assignees,
                    raw_claims_text = EXCLUDED.raw_claims_text,
                    description = EXCLUDED.description,
                    url = EXCLUDED.url,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING id;
            """, (
                patent.patent_number,
                patent.title,
                patent.applicant,
                patent.filing_date,
                patent.publication_date,
                patent.abstract,
                json.dumps(patent.inventors, ensure_ascii=False),
                json.dumps(patent.assignees, ensure_ascii=False),
                patent.raw_claims_text,
                patent.description,
                patent.url
            ))
            
            result = cursor.fetchone()
            patent_id = result[0] if result else None
            
            if not patent_id:
                # 如果是更新操作，获取现有的patent_id
                cursor.execute("SELECT id FROM patents WHERE patent_number = %s", (patent.patent_number,))
                result = cursor.fetchone()
                patent_id = result[0] if result else None
            
            if patent_id and patent.claims:
                # 删除现有的权利要求数据
                cursor.execute("DELETE FROM claims WHERE patent_id = %s", (patent_id,))
                
                # 插入新的权利要求数据
                for claim in patent.claims:
                    cursor.execute("""
                        INSERT INTO claims (
                            patent_id, claim_number, claim_text, claim_type,
                            dependencies, level, confidence_score, language
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        patent_id,
                        claim.claim_number,
                        claim.claim_text,
                        claim.claim_type.value,
                        claim.dependencies,
                        claim.level,
                        claim.confidence_score,
                        claim.language
                    ))
            
            conn.commit()
            logger.info(f"专利数据存储成功: {patent.patent_number}")
            return True
            
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"存储专利数据失败: {e}")
            return False
        finally:
            if conn:
                self.db_pool.putconn(conn)
    
    def get_patent_data(self, patent_number: str) -> Optional[PatentDetails]:
        """获取专利数据"""
        if not self.db_pool:
            return None
        
        conn = None
        try:
            conn = self.db_pool.getconn()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            # 获取专利基本信息
            cursor.execute("""
                SELECT * FROM patents WHERE patent_number = %s
            """, (patent_number,))
            
            patent_row = cursor.fetchone()
            if not patent_row:
                return None
            
            # 获取权利要求数据
            cursor.execute("""
                SELECT * FROM claims WHERE patent_id = %s ORDER BY claim_number
            """, (patent_row['id'],))
            
            claims_rows = cursor.fetchall()
            
            # 构建ClaimNode列表
            claims = []
            for claim_row in claims_rows:
                from .models import ClaimType
                claim = ClaimNode(
                    id=f"claim_{claim_row['claim_number']}",
                    claim_number=claim_row['claim_number'],
                    claim_text=claim_row['claim_text'],
                    claim_type=ClaimType(claim_row['claim_type']),
                    level=claim_row['level'],
                    dependencies=claim_row['dependencies'] or [],
                    confidence_score=claim_row['confidence_score'],
                    language=claim_row['language']
                )
                claims.append(claim)
            
            # 构建PatentDetails对象
            patent = PatentDetails(
                patent_number=patent_row['patent_number'],
                title=patent_row['title'],
                applicant=patent_row['applicant'] or "",
                filing_date=str(patent_row['filing_date']) if patent_row['filing_date'] else "",
                publication_date=str(patent_row['publication_date']) if patent_row['publication_date'] else None,
                abstract=patent_row['abstract'],
                inventors=patent_row['inventors'] or [],
                assignees=patent_row['assignees'] or [],
                claims=claims,
                raw_claims_text=patent_row['raw_claims_text'],
                description=patent_row['description'],
                url=patent_row['url']
            )
            
            return patent
            
        except Exception as e:
            logger.error(f"获取专利数据失败: {e}")
            return None
        finally:
            if conn:
                self.db_pool.putconn(conn)
    
    def search_patents(self, query: str, limit: int = 10) -> List[PatentSearchResult]:
        """搜索专利"""
        if not self.db_pool:
            return []
        
        conn = None
        try:
            conn = self.db_pool.getconn()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            # 构建搜索查询
            search_query = f"%{query}%"
            
            cursor.execute("""
                SELECT 
                    patent_number, title, applicant, filing_date,
                    (SELECT COUNT(*) FROM claims WHERE patent_id = patents.id) as claims_count,
                    CASE 
                        WHEN patent_number ILIKE %s THEN 100
                        WHEN title ILIKE %s THEN 80
                        WHEN applicant ILIKE %s THEN 60
                        ELSE 40
                    END as match_score
                FROM patents 
                WHERE patent_number ILIKE %s 
                   OR title ILIKE %s 
                   OR applicant ILIKE %s
                ORDER BY match_score DESC, filing_date DESC
                LIMIT %s
            """, (search_query, search_query, search_query, search_query, search_query, search_query, limit))
            
            rows = cursor.fetchall()
            
            results = []
            for row in rows:
                result = PatentSearchResult(
                    patent_number=row['patent_number'],
                    title=row['title'],
                    applicant=row['applicant'] or "",
                    filing_date=str(row['filing_date']) if row['filing_date'] else "",
                    claims_count=row['claims_count'] or 0,
                    match_score=row['match_score'] / 100.0
                )
                results.append(result)
            
            return results
            
        except Exception as e:
            logger.error(f"搜索专利失败: {e}")
            return []
        finally:
            if conn:
                self.db_pool.putconn(conn)
    
    def store_claims_tree(self, patent_number: str, tree_data: ClaimsTreeData) -> bool:
        """存储权利要求树数据"""
        if not self.db_pool:
            return False
        
        conn = None
        try:
            conn = self.db_pool.getconn()
            cursor = conn.cursor()
            
            from .models import claims_tree_to_json
            tree_json = claims_tree_to_json(tree_data)
            
            cursor.execute("""
                INSERT INTO claims_trees (patent_number, tree_data, metadata)
                VALUES (%s, %s, %s)
                ON CONFLICT (patent_number) DO UPDATE SET
                    tree_data = EXCLUDED.tree_data,
                    metadata = EXCLUDED.metadata,
                    updated_at = CURRENT_TIMESTAMP
            """, (patent_number, tree_json, json.dumps(tree_data.metadata, ensure_ascii=False)))
            
            conn.commit()
            logger.info(f"权利要求树数据存储成功: {patent_number}")
            return True
            
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"存储权利要求树数据失败: {e}")
            return False
        finally:
            if conn:
                self.db_pool.putconn(conn)
    
    def get_claims_tree(self, patent_number: str) -> Optional[ClaimsTreeData]:
        """获取权利要求树数据"""
        if not self.db_pool:
            return None
        
        conn = None
        try:
            conn = self.db_pool.getconn()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            cursor.execute("""
                SELECT tree_data FROM claims_trees WHERE patent_number = %s
            """, (patent_number,))
            
            row = cursor.fetchone()
            if not row:
                return None
            
            from .models import json_to_claims_tree
            return json_to_claims_tree(row['tree_data'])
            
        except Exception as e:
            logger.error(f"获取权利要求树数据失败: {e}")
            return None
        finally:
            if conn:
                self.db_pool.putconn(conn)


class ConfigurationService(ConfigurationServiceInterface):
    """配置服务实现"""
    
    def __init__(self):
        self.db_pool = get_db_pool()
        if not self.db_pool:
            logger.warning("数据库连接池未初始化")
    
    def get_configuration(self) -> Optional[ColumnConfiguration]:
        """获取当前配置"""
        if not self.db_pool:
            return None
        
        conn = None
        try:
            conn = self.db_pool.getconn()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            cursor.execute("""
                SELECT config_value FROM patent_query_configuration 
                WHERE config_key = 'column_configuration'
            """)
            
            row = cursor.fetchone()
            if not row:
                return None
            
            config_data = row['config_value']
            return ColumnConfiguration(
                patent_number_column=config_data['patent_number_column'],
                excel_file_path=config_data['excel_file_path'],
                column_index=config_data['column_index'],
                header_row=config_data.get('header_row', 1),
                config_id=config_data.get('config_id'),
                created_at=config_data.get('created_at'),
                updated_at=config_data.get('updated_at')
            )
            
        except Exception as e:
            logger.error(f"获取配置失败: {e}")
            return None
        finally:
            if conn:
                self.db_pool.putconn(conn)
    
    def save_configuration(self, config: ColumnConfiguration) -> bool:
        """保存配置"""
        if not self.db_pool:
            return False
        
        conn = None
        try:
            conn = self.db_pool.getconn()
            cursor = conn.cursor()
            
            config_data = {
                'patent_number_column': config.patent_number_column,
                'excel_file_path': config.excel_file_path,
                'column_index': config.column_index,
                'header_row': config.header_row,
                'config_id': config.config_id,
                'created_at': config.created_at or datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            }
            
            cursor.execute("""
                INSERT INTO patent_query_configuration (config_key, config_value, description)
                VALUES ('column_configuration', %s, '专利号列配置')
                ON CONFLICT (config_key) DO UPDATE SET
                    config_value = EXCLUDED.config_value,
                    updated_at = CURRENT_TIMESTAMP
            """, (json.dumps(config_data, ensure_ascii=False),))
            
            conn.commit()
            logger.info("配置保存成功")
            return True
            
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"保存配置失败: {e}")
            return False
        finally:
            if conn:
                self.db_pool.putconn(conn)
    
    def validate_configuration(self, config: ColumnConfiguration) -> ValidationResult:
        """验证配置"""
        errors = []
        warnings = []
        
        # 验证必填字段
        if not config.patent_number_column:
            errors.append("专利号列名不能为空")
        
        if not config.excel_file_path:
            errors.append("Excel文件路径不能为空")
        
        if config.column_index < 0:
            errors.append("列索引不能为负数")
        
        if config.header_row < 1:
            errors.append("标题行号必须大于0")
        
        # 验证文件路径格式
        if config.excel_file_path and not config.excel_file_path.lower().endswith(('.xlsx', '.xls')):
            warnings.append("文件路径应该是Excel文件(.xlsx或.xls)")
        
        return ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings
        )
    
    def delete_configuration(self, config_id: str) -> bool:
        """删除配置"""
        if not self.db_pool:
            return False
        
        conn = None
        try:
            conn = self.db_pool.getconn()
            cursor = conn.cursor()
            
            cursor.execute("""
                DELETE FROM patent_query_configuration 
                WHERE config_key = 'column_configuration'
            """)
            
            conn.commit()
            logger.info("配置删除成功")
            return True
            
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"删除配置失败: {e}")
            return False
        finally:
            if conn:
                self.db_pool.putconn(conn)


# 初始化函数
def init_patent_query_database():
    """初始化专利查询数据库"""
    try:
        DatabaseManager.create_tables()
        logger.info("专利查询数据库初始化成功")
        return True
    except Exception as e:
        logger.error(f"专利查询数据库初始化失败: {e}")
        return False