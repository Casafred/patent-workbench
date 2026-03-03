const IPC_LOCAL_DATA = {
    sections: {
        'A': {
            title: '人类生活需要',
            titleEn: 'HUMAN NECESSITIES',
            children: [
                { symbol: 'A01', title: '农业；林业；畜牧业；狩猎；诱捕；捕鱼', hasChildren: true },
                { symbol: 'A21', title: '焙烤；食用面团', hasChildren: true },
                { symbol: 'A22', title: '屠宰；肉品处理；家禽或鱼的加工', hasChildren: true },
                { symbol: 'A23', title: '食品或食料；其处理或保存', hasChildren: true },
                { symbol: 'A24', title: '烟草；雪茄烟；纸烟；吸烟者用品', hasChildren: true },
                { symbol: 'A41', title: '服装', hasChildren: true },
                { symbol: 'A42', title: '头戴物品', hasChildren: true },
                { symbol: 'A43', title: '鞋类', hasChildren: true },
                { symbol: 'A44', title: '男用服饰或缝纫小附件；珠宝', hasChildren: true },
                { symbol: 'A45', title: '手携物品或旅行用品', hasChildren: true },
                { symbol: 'A46', title: '刷类制品', hasChildren: true },
                { symbol: 'A47', title: '家具；家庭用的物品或设备', hasChildren: true },
                { symbol: 'A61', title: '医学或兽医学；卫生学', hasChildren: true },
                { symbol: 'A62', title: '救生；消防', hasChildren: true },
                { symbol: 'A63', title: '运动；游戏；娱乐活动', hasChildren: true },
                { symbol: 'A99', title: '本部其他类目中不包括的技术主题', hasChildren: true }
            ]
        },
        'B': {
            title: '作业；运输',
            titleEn: 'PERFORMING OPERATIONS; TRANSPORTING',
            children: [
                { symbol: 'B01', title: '一般的物理或化学的方法或装置', hasChildren: true },
                { symbol: 'B02', title: '破碎，磨粉或粉碎；谷物碾磨的预处理', hasChildren: true },
                { symbol: 'B03', title: '用液体或用风力摇床或风力跳汰机分离固体物料', hasChildren: true },
                { symbol: 'B04', title: '用于实现物理或化学工艺过程的离心装置或离心机', hasChildren: true },
                { symbol: 'B05', title: '一般喷射或雾化；对表面涂覆液体或其他流体的一般方法', hasChildren: true },
                { symbol: 'B06', title: '一般机械振动的发生或取得', hasChildren: true },
                { symbol: 'B07', title: '将固体从固体中分离；分选', hasChildren: true },
                { symbol: 'B08', title: '清洁', hasChildren: true },
                { symbol: 'B09', title: '固体废物的处理', hasChildren: true },
                { symbol: 'B21', title: '基本上无切削的金属机械加工；金属板或管、棒或型材的基本上无切削加工或处理', hasChildren: true },
                { symbol: 'B22', title: '铸造；粉末冶金', hasChildren: true },
                { symbol: 'B23', title: '机床；未列入其他类的金属加工', hasChildren: true },
                { symbol: 'B24', title: '磨削；抛光', hasChildren: true },
                { symbol: 'B25', title: '手工具；轻便动力工具；手动器械的手柄；车间设备；机械手', hasChildren: true },
                { symbol: 'B26', title: '手动切割工具；切割；切断', hasChildren: true },
                { symbol: 'B27', title: '木材或类似材料的加工或保存；一般钉钉机或钉U形钉机', hasChildren: true },
                { symbol: 'B28', title: '水泥、粘土或石料的加工', hasChildren: true },
                { symbol: 'B29', title: '塑料的加工；一般处于塑性状态物质的加工', hasChildren: true },
                { symbol: 'B30', title: '压力机', hasChildren: true },
                { symbol: 'B31', title: '纸品制作；纸的加工', hasChildren: true },
                { symbol: 'B32', title: '层状产品', hasChildren: true },
                { symbol: 'B33', title: '增材制造', hasChildren: true },
                { symbol: 'B41', title: '印刷；排版机；打字机；模印机', hasChildren: true },
                { symbol: 'B42', title: '装订；图册；文件夹；特种印刷品', hasChildren: true },
                { symbol: 'B43', title: '书写或绘图器具；办公用品', hasChildren: true },
                { symbol: 'B44', title: '装饰艺术', hasChildren: true },
                { symbol: 'B60', title: '一般车辆', hasChildren: true },
                { symbol: 'B61', title: '铁路', hasChildren: true },
                { symbol: 'B62', title: '无轨陆用车辆', hasChildren: true },
                { symbol: 'B63', title: '船舶或其它水上船只；与船有关的设备', hasChildren: true },
                { symbol: 'B64', title: '飞行器；航空；宇宙航行', hasChildren: true },
                { symbol: 'B65', title: '输送；包装；贮存；搬运薄的或细丝状材料', hasChildren: true },
                { symbol: 'B66', title: '卷扬；提升；牵引', hasChildren: true },
                { symbol: 'B67', title: '开启或封闭瓶子、罐或类似的容器；液体的贮运', hasChildren: true },
                { symbol: 'B68', title: '鞍具；家具罩面', hasChildren: true },
                { symbol: 'B81', title: '微观结构技术', hasChildren: true },
                { symbol: 'B82', title: '纳米技术', hasChildren: true },
                { symbol: 'B99', title: '本部其他类目中不包括的技术主题', hasChildren: true }
            ]
        },
        'C': {
            title: '化学；冶金',
            titleEn: 'CHEMISTRY; METALLURGY',
            children: [
                { symbol: 'C01', title: '无机化学', hasChildren: true },
                { symbol: 'C02', title: '水、废水、污水或污泥的处理', hasChildren: true },
                { symbol: 'C03', title: '玻璃；矿棉或渣棉', hasChildren: true },
                { symbol: 'C04', title: '水泥；混凝土；人造石；陶瓷；耐火材料', hasChildren: true },
                { symbol: 'C05', title: '肥料；肥料制造', hasChildren: true },
                { symbol: 'C06', title: '炸药；火柴', hasChildren: true },
                { symbol: 'C07', title: '有机化学', hasChildren: true },
                { symbol: 'C08', title: '有机高分子化合物；其制备或化学加工；以其为基料的组合物', hasChildren: true },
                { symbol: 'C09', title: '染料；涂料；抛光剂；天然树脂；黏合剂；其他类目不包含的组合物；其他类目不包含的材料的应用', hasChildren: true },
                { symbol: 'C10', title: '石油、煤气及炼焦工业；含一氧化碳的工业气体；燃料；润滑剂；泥煤', hasChildren: true },
                { symbol: 'C11', title: '动物或植物油、脂、脂肪物质或蜡；由此制取的脂肪酸；洗涤剂；蜡烛', hasChildren: true },
                { symbol: 'C12', title: '生物化学；啤酒；烈性酒；果汁酒；醋；微生物学；酶学；突变或遗传工程', hasChildren: true },
                { symbol: 'C13', title: '糖工业', hasChildren: true },
                { symbol: 'C14', title: '小原皮；大原皮；毛皮；皮革', hasChildren: true },
                { symbol: 'C21', title: '铁的冶金', hasChildren: true },
                { symbol: 'C22', title: '冶金；黑色或有色金属合金；合金或有色金属的处理', hasChildren: true },
                { symbol: 'C23', title: '对金属材料的镀覆；用金属材料对材料的镀覆；表面扩散法，化学镀覆或置换法的金属材料表面处理；真空蒸发法、溅射法、离子注入法或化学气相沉积法的一般镀覆', hasChildren: true },
                { symbol: 'C25', title: '电解或电泳工艺；其所用设备', hasChildren: true },
                { symbol: 'C30', title: '晶体生长', hasChildren: true },
                { symbol: 'C40', title: '组合技术', hasChildren: true },
                { symbol: 'C99', title: '本部其他类目中不包括的技术主题', hasChildren: true }
            ]
        },
        'D': {
            title: '纺织；造纸',
            titleEn: 'TEXTILES; PAPER',
            children: [
                { symbol: 'D01', title: '天然或人造的线或纤维；纺纱', hasChildren: true },
                { symbol: 'D02', title: '纱线；纱线或绳索的机械整理；整经或络经', hasChildren: true },
                { symbol: 'D03', title: '织造', hasChildren: true },
                { symbol: 'D04', title: '编织；花边制作；针织；饰带；无纺织物', hasChildren: true },
                { symbol: 'D05', title: '缝纫；绣花；簇绒', hasChildren: true },
                { symbol: 'D06', title: '织物等的处理；洗涤；其他类不包括的柔性材料', hasChildren: true },
                { symbol: 'D07', title: '绳；除电缆以外的缆索', hasChildren: true },
                { symbol: 'D21', title: '造纸；纤维素的生产', hasChildren: true },
                { symbol: 'D99', title: '本部其他类目中不包括的技术主题', hasChildren: true }
            ]
        },
        'E': {
            title: '固定建筑物',
            titleEn: 'FIXED CONSTRUCTIONS',
            children: [
                { symbol: 'E01', title: '道路、铁路或桥梁的建筑', hasChildren: true },
                { symbol: 'E02', title: '水利工程；基础；疏浚', hasChildren: true },
                { symbol: 'E03', title: '给水；排水', hasChildren: true },
                { symbol: 'E04', title: '建筑物', hasChildren: true },
                { symbol: 'E05', title: '锁；钥匙；门窗零件；保险箱', hasChildren: true },
                { symbol: 'E06', title: '一般门、窗、百叶窗或卷辊遮帘；梯子', hasChildren: true },
                { symbol: 'E21', title: '土层或岩石的钻进；采矿', hasChildren: true },
                { symbol: 'E99', title: '本部其他类目中不包括的技术主题', hasChildren: true }
            ]
        },
        'F': {
            title: '机械工程；照明；加热；武器；爆破',
            titleEn: 'MECHANICAL ENGINEERING; LIGHTING; HEATING; WEAPONS; BLASTING',
            children: [
                { symbol: 'F01', title: '一般机器或发动机；一般的发动机装置；蒸汽机', hasChildren: true },
                { symbol: 'F02', title: '燃烧发动机；热气或燃烧生成物的发动机装置', hasChildren: true },
                { symbol: 'F03', title: '液力机械或液力发动机；风力、弹力、重力或其他发动机；未列入其他类的产生机械动力或反推力的发动机', hasChildren: true },
                { symbol: 'F04', title: '液体变容式机械；液体泵或弹性流体泵', hasChildren: true },
                { symbol: 'F15', title: '流体压力执行机构；一般液压技术和气动技术', hasChildren: true },
                { symbol: 'F16', title: '工程元件或部件；为产生和保持机器或设备的有效运行的一般措施；一般绝热', hasChildren: true },
                { symbol: 'F17', title: '气体或液体的贮存或分配', hasChildren: true },
                { symbol: 'F21', title: '照明', hasChildren: true },
                { symbol: 'F22', title: '蒸汽的发生', hasChildren: true },
                { symbol: 'F23', title: '燃烧设备；燃烧方法', hasChildren: true },
                { symbol: 'F24', title: '供热；炉灶；通风', hasChildren: true },
                { symbol: 'F25', title: '制冷或冷却；制冷和冷却系统的联合操作；热泵系统；冰的制造或储存；气体的液化或固化', hasChildren: true },
                { symbol: 'F26', title: '干燥', hasChildren: true },
                { symbol: 'F27', title: '炉；窑；烘烤炉；蒸馏炉', hasChildren: true },
                { symbol: 'F28', title: '一般热交换', hasChildren: true },
                { symbol: 'F41', title: '武器', hasChildren: true },
                { symbol: 'F42', title: '弹药；爆破', hasChildren: true },
                { symbol: 'F99', title: '本部其他类目中不包括的技术主题', hasChildren: true }
            ]
        },
        'G': {
            title: '物理',
            titleEn: 'PHYSICS',
            children: [
                { symbol: 'G01', title: '测量；测试', hasChildren: true },
                { symbol: 'G02', title: '光学', hasChildren: true },
                { symbol: 'G03', title: '摄影术；电影术；利用了光波以外其他波的类似技术；电刻术；全息摄影术', hasChildren: true },
                { symbol: 'G04', title: '测时学', hasChildren: true },
                { symbol: 'G05', title: '控制；调节', hasChildren: true },
                { symbol: 'G06', title: '计算；推算；计数', hasChildren: true },
                { symbol: 'G07', title: '核算装置', hasChildren: true },
                { symbol: 'G08', title: '信号装置', hasChildren: true },
                { symbol: 'G09', title: '教育；密码术；显示；广告；印鉴', hasChildren: true },
                { symbol: 'G10', title: '乐器；声学', hasChildren: true },
                { symbol: 'G11', title: '信息存储', hasChildren: true },
                { symbol: 'G12', title: '仪器的零部件', hasChildren: true },
                { symbol: 'G21', title: '核物理；核工程', hasChildren: true },
                { symbol: 'G99', title: '本部其他类目中不包括的技术主题', hasChildren: true }
            ]
        },
        'H': {
            title: '电学',
            titleEn: 'ELECTRICITY',
            children: [
                { symbol: 'H01', title: '基本电气元件', hasChildren: true },
                { symbol: 'H02', title: '发电、变电或配电', hasChildren: true },
                { symbol: 'H03', title: '基本电子电路', hasChildren: true },
                { symbol: 'H04', title: '电通信技术', hasChildren: true },
                { symbol: 'H05', title: '其他类目不包含的电技术', hasChildren: true },
                { symbol: 'H99', title: '本部其他类目中不包括的技术主题', hasChildren: true }
            ]
        }
    }
};

if (typeof window !== 'undefined') {
    window.IPC_LOCAL_DATA = IPC_LOCAL_DATA;
}
