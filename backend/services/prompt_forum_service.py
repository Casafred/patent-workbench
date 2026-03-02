"""
Prompt Forum Service

This module provides services for the prompt sharing forum, including:
- Prompt CRUD operations
- Comments management
- Likes and favorites
- Categories and tags
- Moderation system
"""

from backend.extensions import get_db_pool


class PromptForumService:
    """Service class for prompt forum operations."""
    
    @staticmethod
    def init_tables():
        """Initialize all forum-related database tables."""
        db_pool = get_db_pool()
        if not db_pool:
            print("警告: 数据库连接池未初始化，跳过论坛表创建。")
            return
        
        conn = None
        try:
            conn = db_pool.getconn()
            with conn.cursor() as cur:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS prompt_categories (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(50) NOT NULL UNIQUE,
                        description TEXT,
                        icon VARCHAR(50),
                        sort_order INT DEFAULT 0,
                        created_at TIMESTAMPTZ DEFAULT NOW()
                    );
                """)
                
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS prompt_tags (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(30) NOT NULL UNIQUE,
                        use_count INT DEFAULT 0
                    );
                """)
                
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS prompts (
                        id SERIAL PRIMARY KEY,
                        title VARCHAR(100) NOT NULL,
                        description TEXT,
                        content TEXT NOT NULL,
                        category_id INT REFERENCES prompt_categories(id) ON DELETE SET NULL,
                        author_username VARCHAR(255) NOT NULL,
                        target_feature VARCHAR(20) DEFAULT 'feature_1',
                        model VARCHAR(50),
                        temperature FLOAT DEFAULT 0.1,
                        output_fields JSONB,
                        view_count INT DEFAULT 0,
                        like_count INT DEFAULT 0,
                        favorite_count INT DEFAULT 0,
                        import_count INT DEFAULT 0,
                        is_featured BOOLEAN DEFAULT FALSE,
                        status VARCHAR(20) DEFAULT 'pending',
                        created_at TIMESTAMPTZ DEFAULT NOW(),
                        updated_at TIMESTAMPTZ DEFAULT NOW()
                    );
                """)
                
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS prompt_tag_relations (
                        prompt_id INT REFERENCES prompts(id) ON DELETE CASCADE,
                        tag_id INT REFERENCES prompt_tags(id) ON DELETE CASCADE,
                        PRIMARY KEY (prompt_id, tag_id)
                    );
                """)
                
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS prompt_comments (
                        id SERIAL PRIMARY KEY,
                        prompt_id INT REFERENCES prompts(id) ON DELETE CASCADE,
                        author_username VARCHAR(255) NOT NULL,
                        content TEXT NOT NULL,
                        status VARCHAR(20) DEFAULT 'pending',
                        created_at TIMESTAMPTZ DEFAULT NOW()
                    );
                """)
                
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS prompt_likes (
                        prompt_id INT REFERENCES prompts(id) ON DELETE CASCADE,
                        username VARCHAR(255) NOT NULL,
                        created_at TIMESTAMPTZ DEFAULT NOW(),
                        PRIMARY KEY (prompt_id, username)
                    );
                """)
                
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS prompt_favorites (
                        prompt_id INT REFERENCES prompts(id) ON DELETE CASCADE,
                        username VARCHAR(255) NOT NULL,
                        created_at TIMESTAMPTZ DEFAULT NOW(),
                        PRIMARY KEY (prompt_id, username)
                    );
                """)
                
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS prompt_moderation_logs (
                        id SERIAL PRIMARY KEY,
                        target_type VARCHAR(20) NOT NULL,
                        target_id INT NOT NULL,
                        action VARCHAR(20) NOT NULL,
                        moderator_username VARCHAR(255) NOT NULL,
                        reason TEXT,
                        created_at TIMESTAMPTZ DEFAULT NOW()
                    );
                """)
                
                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_prompts_status ON prompts(status);
                """)
                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_prompts_category ON prompts(category_id);
                """)
                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_prompts_author ON prompts(author_username);
                """)
                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_prompts_created ON prompts(created_at DESC);
                """)
                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_comments_prompt ON prompt_comments(prompt_id);
                """)
                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_comments_status ON prompt_comments(status);
                """)
                
                conn.commit()
                print("论坛数据库表已准备就绪。")
                
                PromptForumService._init_default_categories(cur, conn)
                
        except Exception as e:
            print(f"论坛数据库表初始化失败: {e}")
            if conn:
                conn.rollback()
        finally:
            if conn:
                db_pool.putconn(conn)
    
    @staticmethod
    def _init_default_categories(cur, conn):
        """Initialize default prompt categories."""
        default_categories = [
            ('专利检索', '专利检索相关的提示词', '🔍', 1),
            ('权利要求', '权利要求分析与处理提示词', '📝', 2),
            ('说明书', '专利说明书相关提示词', '📄', 3),
            ('附图标记', '附图标记与OCR相关提示词', '🖼️', 4),
            ('智能分类', '专利智能分类标引提示词', '🏷️', 5),
            ('其他', '其他类型的提示词', '📌', 99),
        ]
        
        try:
            for name, desc, icon, order in default_categories:
                cur.execute("""
                    INSERT INTO prompt_categories (name, description, icon, sort_order)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (name) DO NOTHING;
                """, (name, desc, icon, order))
            conn.commit()
        except Exception as e:
            print(f"初始化默认分类失败: {e}")
    
    @staticmethod
    def get_prompts_list(page=1, per_page=20, category_id=None, 
                         status='approved', sort_by='latest', keyword=None):
        """
        Get paginated list of prompts.
        
        Args:
            page: Page number (1-indexed)
            per_page: Items per page
            category_id: Filter by category
            status: Filter by status (pending/approved/rejected)
            sort_by: Sort method (latest/hottest/most_favorites/most_imports)
            keyword: Search keyword
        
        Returns:
            dict: {prompts: [...], total: int, page: int, per_page: int, total_pages: int}
        """
        db_pool = get_db_pool()
        if not db_pool:
            return {'prompts': [], 'total': 0, 'page': page, 'per_page': per_page, 'total_pages': 0}
        
        conn = None
        try:
            conn = db_pool.getconn()
            with conn.cursor() as cur:
                offset = (page - 1) * per_page
                
                where_clauses = []
                params = []
                
                if status:
                    where_clauses.append("p.status = %s")
                    params.append(status)
                
                if category_id:
                    where_clauses.append("p.category_id = %s")
                    params.append(category_id)
                
                if keyword:
                    where_clauses.append("(p.title ILIKE %s OR p.description ILIKE %s OR p.content ILIKE %s)")
                    keyword_param = f"%{keyword}%"
                    params.extend([keyword_param, keyword_param, keyword_param])
                
                where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"
                
                sort_sql = {
                    'latest': 'p.created_at DESC',
                    'hottest': 'p.view_count DESC',
                    'most_favorites': 'p.favorite_count DESC',
                    'most_imports': 'p.import_count DESC',
                }.get(sort_by, 'p.created_at DESC')
                
                count_sql = f"SELECT COUNT(*) FROM prompts p WHERE {where_sql}"
                cur.execute(count_sql, params)
                total = cur.fetchone()[0]
                
                list_sql = f"""
                    SELECT p.id, p.title, p.description, p.category_id, p.author_username,
                           p.target_feature, p.view_count, p.like_count, p.favorite_count,
                           p.import_count, p.is_featured, p.status, p.created_at,
                           c.name as category_name, c.icon as category_icon
                    FROM prompts p
                    LEFT JOIN prompt_categories c ON p.category_id = c.id
                    WHERE {where_sql}
                    ORDER BY p.is_featured DESC, {sort_sql}
                    LIMIT %s OFFSET %s
                """
                cur.execute(list_sql, params + [per_page, offset])
                rows = cur.fetchall()
                
                prompts = []
                for row in rows:
                    prompts.append({
                        'id': row[0],
                        'title': row[1],
                        'description': row[2],
                        'category_id': row[3],
                        'author_username': row[4],
                        'target_feature': row[5],
                        'view_count': row[6],
                        'like_count': row[7],
                        'favorite_count': row[8],
                        'import_count': row[9],
                        'is_featured': row[10],
                        'status': row[11],
                        'created_at': row[12].isoformat() if row[12] else None,
                        'category_name': row[13],
                        'category_icon': row[14],
                    })
                
                total_pages = (total + per_page - 1) // per_page
                
                return {
                    'prompts': prompts,
                    'total': total,
                    'page': page,
                    'per_page': per_page,
                    'total_pages': total_pages
                }
                
        except Exception as e:
            print(f"获取提示词列表失败: {e}")
            return {'prompts': [], 'total': 0, 'page': page, 'per_page': per_page, 'total_pages': 0}
        finally:
            if conn:
                db_pool.putconn(conn)
    
    @staticmethod
    def get_prompt_by_id(prompt_id, username=None):
        """
        Get prompt details by ID.
        
        Args:
            prompt_id: Prompt ID
            username: Current user (for checking like/favorite status)
        
        Returns:
            dict: Prompt details or None
        """
        db_pool = get_db_pool()
        if not db_pool:
            return None
        
        conn = None
        try:
            conn = db_pool.getconn()
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE prompts SET view_count = view_count + 1 WHERE id = %s
                """, (prompt_id,))
                conn.commit()
                
                cur.execute("""
                    SELECT p.id, p.title, p.description, p.content, p.category_id,
                           p.author_username, p.target_feature, p.model, p.temperature,
                           p.output_fields, p.view_count, p.like_count, p.favorite_count,
                           p.import_count, p.is_featured, p.status, p.created_at, p.updated_at,
                           c.name as category_name, c.icon as category_icon
                    FROM prompts p
                    LEFT JOIN prompt_categories c ON p.category_id = c.id
                    WHERE p.id = %s
                """, (prompt_id,))
                row = cur.fetchone()
                
                if not row:
                    return None
                
                prompt = {
                    'id': row[0],
                    'title': row[1],
                    'description': row[2],
                    'content': row[3],
                    'category_id': row[4],
                    'author_username': row[5],
                    'target_feature': row[6],
                    'model': row[7],
                    'temperature': row[8],
                    'output_fields': row[9],
                    'view_count': row[10],
                    'like_count': row[11],
                    'favorite_count': row[12],
                    'import_count': row[13],
                    'is_featured': row[14],
                    'status': row[15],
                    'created_at': row[16].isoformat() if row[16] else None,
                    'updated_at': row[17].isoformat() if row[17] else None,
                    'category_name': row[18],
                    'category_icon': row[19],
                    'is_liked': False,
                    'is_favorited': False,
                }
                
                cur.execute("""
                    SELECT t.name FROM prompt_tags t
                    JOIN prompt_tag_relations r ON t.id = r.tag_id
                    WHERE r.prompt_id = %s
                """, (prompt_id,))
                prompt['tags'] = [tag[0] for tag in cur.fetchall()]
                
                if username:
                    cur.execute("""
                        SELECT 1 FROM prompt_likes WHERE prompt_id = %s AND username = %s
                    """, (prompt_id, username))
                    prompt['is_liked'] = cur.fetchone() is not None
                    
                    cur.execute("""
                        SELECT 1 FROM prompt_favorites WHERE prompt_id = %s AND username = %s
                    """, (prompt_id, username))
                    prompt['is_favorited'] = cur.fetchone() is not None
                
                return prompt
                
        except Exception as e:
            print(f"获取提示词详情失败: {e}")
            return None
        finally:
            if conn:
                db_pool.putconn(conn)
    
    @staticmethod
    def create_prompt(data):
        """
        Create a new prompt.
        
        Args:
            data: dict with title, description, content, category_id, author_username,
                  target_feature, model, temperature, output_fields, tags
        
        Returns:
            dict: {success: bool, prompt_id: int, message: str}
        """
        db_pool = get_db_pool()
        if not db_pool:
            return {'success': False, 'message': '数据库未连接'}
        
        conn = None
        try:
            conn = db_pool.getconn()
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO prompts (title, description, content, category_id,
                                        author_username, target_feature, model, 
                                        temperature, output_fields, status)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'pending')
                    RETURNING id
                """, (
                    data['title'],
                    data.get('description', ''),
                    data['content'],
                    data.get('category_id'),
                    data['author_username'],
                    data.get('target_feature', 'feature_1'),
                    data.get('model'),
                    data.get('temperature', 0.1),
                    data.get('output_fields')
                ))
                prompt_id = cur.fetchone()[0]
                
                tags = data.get('tags', [])
                for tag_name in tags:
                    if tag_name.strip():
                        cur.execute("""
                            INSERT INTO prompt_tags (name) VALUES (%s)
                            ON CONFLICT (name) DO UPDATE SET use_count = prompt_tags.use_count + 1
                            RETURNING id
                        """, (tag_name.strip(),))
                        tag_id = cur.fetchone()[0]
                        
                        cur.execute("""
                            INSERT INTO prompt_tag_relations (prompt_id, tag_id) VALUES (%s, %s)
                            ON CONFLICT DO NOTHING
                        """, (prompt_id, tag_id))
                
                conn.commit()
                return {'success': True, 'prompt_id': prompt_id, 'message': '提示词已提交，等待审核'}
                
        except Exception as e:
            print(f"创建提示词失败: {e}")
            if conn:
                conn.rollback()
            return {'success': False, 'message': f'创建失败: {str(e)}'}
        finally:
            if conn:
                db_pool.putconn(conn)
    
    @staticmethod
    def toggle_like(prompt_id, username):
        """
        Toggle like status for a prompt.
        
        Returns:
            dict: {success: bool, is_liked: bool, like_count: int}
        """
        db_pool = get_db_pool()
        if not db_pool:
            return {'success': False, 'message': '数据库未连接'}
        
        conn = None
        try:
            conn = db_pool.getconn()
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT 1 FROM prompt_likes WHERE prompt_id = %s AND username = %s
                """, (prompt_id, username))
                
                if cur.fetchone():
                    cur.execute("""
                        DELETE FROM prompt_likes WHERE prompt_id = %s AND username = %s
                    """, (prompt_id, username))
                    cur.execute("""
                        UPDATE prompts SET like_count = GREATEST(0, like_count - 1) WHERE id = %s
                    """, (prompt_id,))
                    is_liked = False
                else:
                    cur.execute("""
                        INSERT INTO prompt_likes (prompt_id, username) VALUES (%s, %s)
                    """, (prompt_id, username))
                    cur.execute("""
                        UPDATE prompts SET like_count = like_count + 1 WHERE id = %s
                    """, (prompt_id,))
                    is_liked = True
                
                conn.commit()
                
                cur.execute("SELECT like_count FROM prompts WHERE id = %s", (prompt_id,))
                like_count = cur.fetchone()[0]
                
                return {'success': True, 'is_liked': is_liked, 'like_count': like_count}
                
        except Exception as e:
            print(f"切换点赞状态失败: {e}")
            if conn:
                conn.rollback()
            return {'success': False, 'message': str(e)}
        finally:
            if conn:
                db_pool.putconn(conn)
    
    @staticmethod
    def toggle_favorite(prompt_id, username):
        """
        Toggle favorite status for a prompt.
        
        Returns:
            dict: {success: bool, is_favorited: bool, favorite_count: int}
        """
        db_pool = get_db_pool()
        if not db_pool:
            return {'success': False, 'message': '数据库未连接'}
        
        conn = None
        try:
            conn = db_pool.getconn()
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT 1 FROM prompt_favorites WHERE prompt_id = %s AND username = %s
                """, (prompt_id, username))
                
                if cur.fetchone():
                    cur.execute("""
                        DELETE FROM prompt_favorites WHERE prompt_id = %s AND username = %s
                    """, (prompt_id, username))
                    cur.execute("""
                        UPDATE prompts SET favorite_count = GREATEST(0, favorite_count - 1) WHERE id = %s
                    """, (prompt_id,))
                    is_favorited = False
                else:
                    cur.execute("""
                        INSERT INTO prompt_favorites (prompt_id, username) VALUES (%s, %s)
                    """, (prompt_id, username))
                    cur.execute("""
                        UPDATE prompts SET favorite_count = favorite_count + 1 WHERE id = %s
                    """, (prompt_id,))
                    is_favorited = True
                
                conn.commit()
                
                cur.execute("SELECT favorite_count FROM prompts WHERE id = %s", (prompt_id,))
                favorite_count = cur.fetchone()[0]
                
                return {'success': True, 'is_favorited': is_favorited, 'favorite_count': favorite_count}
                
        except Exception as e:
            print(f"切换收藏状态失败: {e}")
            if conn:
                conn.rollback()
            return {'success': False, 'message': str(e)}
        finally:
            if conn:
                db_pool.putconn(conn)
    
    @staticmethod
    def record_import(prompt_id):
        """Record an import action for a prompt."""
        db_pool = get_db_pool()
        if not db_pool:
            return
        
        conn = None
        try:
            conn = db_pool.getconn()
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE prompts SET import_count = import_count + 1 WHERE id = %s
                """, (prompt_id,))
                conn.commit()
        except Exception as e:
            print(f"记录导入失败: {e}")
        finally:
            if conn:
                db_pool.putconn(conn)
    
    @staticmethod
    def get_comments(prompt_id, page=1, per_page=20):
        """Get approved comments for a prompt."""
        db_pool = get_db_pool()
        if not db_pool:
            return {'comments': [], 'total': 0}
        
        conn = None
        try:
            conn = db_pool.getconn()
            with conn.cursor() as cur:
                offset = (page - 1) * per_page
                
                cur.execute("""
                    SELECT COUNT(*) FROM prompt_comments 
                    WHERE prompt_id = %s AND status = 'approved'
                """, (prompt_id,))
                total = cur.fetchone()[0]
                
                cur.execute("""
                    SELECT id, author_username, content, created_at
                    FROM prompt_comments
                    WHERE prompt_id = %s AND status = 'approved'
                    ORDER BY created_at DESC
                    LIMIT %s OFFSET %s
                """, (prompt_id, per_page, offset))
                
                comments = []
                for row in cur.fetchall():
                    comments.append({
                        'id': row[0],
                        'author_username': row[1],
                        'content': row[2],
                        'created_at': row[3].isoformat() if row[3] else None
                    })
                
                return {'comments': comments, 'total': total}
                
        except Exception as e:
            print(f"获取评论失败: {e}")
            return {'comments': [], 'total': 0}
        finally:
            if conn:
                db_pool.putconn(conn)
    
    @staticmethod
    def create_comment(prompt_id, username, content):
        """Create a new comment (pending approval)."""
        db_pool = get_db_pool()
        if not db_pool:
            return {'success': False, 'message': '数据库未连接'}
        
        conn = None
        try:
            conn = db_pool.getconn()
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO prompt_comments (prompt_id, author_username, content, status)
                    VALUES (%s, %s, %s, 'pending')
                    RETURNING id
                """, (prompt_id, username, content))
                comment_id = cur.fetchone()[0]
                conn.commit()
                
                return {'success': True, 'comment_id': comment_id, 'message': '评论已提交，等待审核'}
                
        except Exception as e:
            print(f"创建评论失败: {e}")
            if conn:
                conn.rollback()
            return {'success': False, 'message': str(e)}
        finally:
            if conn:
                db_pool.putconn(conn)
    
    @staticmethod
    def get_categories():
        """Get all prompt categories."""
        db_pool = get_db_pool()
        if not db_pool:
            return []
        
        conn = None
        try:
            conn = db_pool.getconn()
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, name, description, icon, sort_order
                    FROM prompt_categories
                    ORDER BY sort_order
                """)
                
                categories = []
                for row in cur.fetchall():
                    categories.append({
                        'id': row[0],
                        'name': row[1],
                        'description': row[2],
                        'icon': row[3],
                        'sort_order': row[4]
                    })
                
                return categories
                
        except Exception as e:
            print(f"获取分类失败: {e}")
            return []
        finally:
            if conn:
                db_pool.putconn(conn)
    
    @staticmethod
    def get_popular_tags(limit=20):
        """Get popular tags by use count."""
        db_pool = get_db_pool()
        if not db_pool:
            return []
        
        conn = None
        try:
            conn = db_pool.getconn()
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT name, use_count FROM prompt_tags
                    ORDER BY use_count DESC
                    LIMIT %s
                """, (limit,))
                
                tags = []
                for row in cur.fetchall():
                    tags.append({'name': row[0], 'use_count': row[1]})
                
                return tags
                
        except Exception as e:
            print(f"获取热门标签失败: {e}")
            return []
        finally:
            if conn:
                db_pool.putconn(conn)
    
    @staticmethod
    def get_user_prompts(username, page=1, per_page=20):
        """Get prompts created by a user."""
        db_pool = get_db_pool()
        if not db_pool:
            return {'prompts': [], 'total': 0}
        
        conn = None
        try:
            conn = db_pool.getconn()
            with conn.cursor() as cur:
                offset = (page - 1) * per_page
                
                cur.execute("""
                    SELECT COUNT(*) FROM prompts WHERE author_username = %s
                """, (username,))
                total = cur.fetchone()[0]
                
                cur.execute("""
                    SELECT p.id, p.title, p.description, p.status, p.view_count,
                           p.like_count, p.favorite_count, p.import_count, p.created_at,
                           c.name as category_name
                    FROM prompts p
                    LEFT JOIN prompt_categories c ON p.category_id = c.id
                    WHERE p.author_username = %s
                    ORDER BY p.created_at DESC
                    LIMIT %s OFFSET %s
                """, (username, username, per_page, offset))
                
                prompts = []
                for row in cur.fetchall():
                    prompts.append({
                        'id': row[0],
                        'title': row[1],
                        'description': row[2],
                        'status': row[3],
                        'view_count': row[4],
                        'like_count': row[5],
                        'favorite_count': row[6],
                        'import_count': row[7],
                        'created_at': row[8].isoformat() if row[8] else None,
                        'category_name': row[9]
                    })
                
                return {'prompts': prompts, 'total': total}
                
        except Exception as e:
            print(f"获取用户提示词失败: {e}")
            return {'prompts': [], 'total': 0}
        finally:
            if conn:
                db_pool.putconn(conn)
    
    @staticmethod
    def get_user_favorites(username, page=1, per_page=20):
        """Get prompts favorited by a user."""
        db_pool = get_db_pool()
        if not db_pool:
            return {'prompts': [], 'total': 0}
        
        conn = None
        try:
            conn = db_pool.getconn()
            with conn.cursor() as cur:
                offset = (page - 1) * per_page
                
                cur.execute("""
                    SELECT COUNT(*) FROM prompt_favorites WHERE username = %s
                """, (username,))
                total = cur.fetchone()[0]
                
                cur.execute("""
                    SELECT p.id, p.title, p.description, p.status, p.view_count,
                           p.like_count, p.favorite_count, p.import_count,
                           f.created_at as favorited_at,
                           c.name as category_name
                    FROM prompt_favorites f
                    JOIN prompts p ON f.prompt_id = p.id
                    LEFT JOIN prompt_categories c ON p.category_id = c.id
                    WHERE f.username = %s AND p.status = 'approved'
                    ORDER BY f.created_at DESC
                    LIMIT %s OFFSET %s
                """, (username, per_page, offset))
                
                prompts = []
                for row in cur.fetchall():
                    prompts.append({
                        'id': row[0],
                        'title': row[1],
                        'description': row[2],
                        'status': row[3],
                        'view_count': row[4],
                        'like_count': row[5],
                        'favorite_count': row[6],
                        'import_count': row[7],
                        'favorited_at': row[8].isoformat() if row[8] else None,
                        'category_name': row[9]
                    })
                
                return {'prompts': prompts, 'total': total}
                
        except Exception as e:
            print(f"获取用户收藏失败: {e}")
            return {'prompts': [], 'total': 0}
        finally:
            if conn:
                db_pool.putconn(conn)
    
    @staticmethod
    def get_pending_items(item_type='prompt', page=1, per_page=20):
        """Get pending items for moderation."""
        db_pool = get_db_pool()
        if not db_pool:
            return {'items': [], 'total': 0}
        
        conn = None
        try:
            conn = db_pool.getconn()
            with conn.cursor() as cur:
                offset = (page - 1) * per_page
                
                if item_type == 'prompt':
                    cur.execute("""
                        SELECT COUNT(*) FROM prompts WHERE status = 'pending'
                    """)
                    total = cur.fetchone()[0]
                    
                    cur.execute("""
                        SELECT id, title, description, content, author_username, created_at
                        FROM prompts
                        WHERE status = 'pending'
                        ORDER BY created_at ASC
                        LIMIT %s OFFSET %s
                    """, (per_page, offset))
                    
                    items = []
                    for row in cur.fetchall():
                        items.append({
                            'id': row[0],
                            'title': row[1],
                            'description': row[2],
                            'content': row[3],
                            'author_username': row[4],
                            'created_at': row[5].isoformat() if row[5] else None
                        })
                    
                else:  # comment
                    cur.execute("""
                        SELECT COUNT(*) FROM prompt_comments WHERE status = 'pending'
                    """)
                    total = cur.fetchone()[0]
                    
                    cur.execute("""
                        SELECT c.id, c.prompt_id, c.author_username, c.content, c.created_at,
                               p.title as prompt_title
                        FROM prompt_comments c
                        LEFT JOIN prompts p ON c.prompt_id = p.id
                        WHERE c.status = 'pending'
                        ORDER BY c.created_at ASC
                        LIMIT %s OFFSET %s
                    """, (per_page, offset))
                    
                    items = []
                    for row in cur.fetchall():
                        items.append({
                            'id': row[0],
                            'prompt_id': row[1],
                            'author_username': row[2],
                            'content': row[3],
                            'created_at': row[4].isoformat() if row[4] else None,
                            'prompt_title': row[5]
                        })
                
                return {'items': items, 'total': total}
                
        except Exception as e:
            print(f"获取待审核项目失败: {e}")
            return {'items': [], 'total': 0}
        finally:
            if conn:
                db_pool.putconn(conn)
    
    @staticmethod
    def moderate_item(item_type, item_id, action, moderator_username, reason=None):
        """
        Approve or reject an item.
        
        Args:
            item_type: 'prompt' or 'comment'
            item_id: Item ID
            action: 'approve' or 'reject'
            moderator_username: Username of moderator
            reason: Optional reason for rejection
        
        Returns:
            dict: {success: bool, message: str}
        """
        db_pool = get_db_pool()
        if not db_pool:
            return {'success': False, 'message': '数据库未连接'}
        
        conn = None
        try:
            conn = db_pool.getconn()
            with conn.cursor() as cur:
                new_status = 'approved' if action == 'approve' else 'rejected'
                
                if item_type == 'prompt':
                    cur.execute("""
                        UPDATE prompts SET status = %s WHERE id = %s
                    """, (new_status, item_id))
                else:
                    cur.execute("""
                        UPDATE prompt_comments SET status = %s WHERE id = %s
                    """, (new_status, item_id))
                
                cur.execute("""
                    INSERT INTO prompt_moderation_logs 
                    (target_type, target_id, action, moderator_username, reason)
                    VALUES (%s, %s, %s, %s, %s)
                """, (item_type, item_id, action, moderator_username, reason))
                
                conn.commit()
                
                return {'success': True, 'message': f'已{action}该{item_type}'}
                
        except Exception as e:
            print(f"审核操作失败: {e}")
            if conn:
                conn.rollback()
            return {'success': False, 'message': str(e)}
        finally:
            if conn:
                db_pool.putconn(conn)
    
    @staticmethod
    def get_featured_prompts(limit=5):
        """Get featured prompts for homepage display."""
        db_pool = get_db_pool()
        if not db_pool:
            return []
        
        conn = None
        try:
            conn = db_pool.getconn()
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT p.id, p.title, p.description, p.view_count, p.like_count,
                           p.import_count, c.name as category_name, c.icon as category_icon
                    FROM prompts p
                    LEFT JOIN prompt_categories c ON p.category_id = c.id
                    WHERE p.status = 'approved' AND p.is_featured = TRUE
                    ORDER BY p.import_count DESC
                    LIMIT %s
                """, (limit,))
                
                prompts = []
                for row in cur.fetchall():
                    prompts.append({
                        'id': row[0],
                        'title': row[1],
                        'description': row[2],
                        'view_count': row[3],
                        'like_count': row[4],
                        'import_count': row[5],
                        'category_name': row[6],
                        'category_icon': row[7]
                    })
                
                return prompts
                
        except Exception as e:
            print(f"获取精选提示词失败: {e}")
            return []
        finally:
            if conn:
                db_pool.putconn(conn)
