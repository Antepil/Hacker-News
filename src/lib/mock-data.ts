import { Story } from './types';

export const MOCK_STORIES: Story[] = [
    {
        id: 3920192,
        title: "Redis changes its license to RSALv2/SSPLv1",
        titleZh: "Redis 宣布修改开源协议",
        url: "https://redis.io/blog/redis-adopts-dual-source-available-licensing/",
        domain: "redis.io",
        score: 450,
        by: "antirez",
        time: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
        descendants: 120,
        category: "编程开发",
        sentiment: {
            constructive: 20,
            technical: 50,
            controversial: 30
        },
        summary: [
            "Redis 核心将不再采用 BSD 协议。",
            "新的双重协议：RSALv2 和 SSPLv1。",
            "云服务商（如 AWS）受影响最大，必须付费使用。"
        ],
        interpretation: [
            "这是对云厂商 '白嫖' 开源软件的反击。",
            "对于普通开发者和企业内部使用，几乎没有影响。",
            "标志着开源商业化进入了更加激进的保护阶段。"
        ],
        aiComments: [
            "AWS 可能需要 fork 一个自己的版本了 (Valkey?)。",
            "理解 Redis 公司的决定，但感情上很难接受不再是纯粹的 OSS。",
            "ElasticSearch 之前也做了类似的事，看来是趋势。"
        ],
        keywords: ["Redis", "License", "NoSQL", "Open Source"]
    },
    {
        id: 3920193,
        title: "The end of 0% interest rates and the tech reckoning",
        titleZh: "零利率时代的终结与科技圈的清算",
        url: "https://www.economist.com/finance-and-economics/2026/01/14/tech-reckoning",
        domain: "economist.com",
        score: 890,
        by: "economist_fan",
        time: Math.floor(Date.now() / 1000) - 18000, // 5 hours ago
        descendants: 340,
        category: "商业财经",
        sentiment: {
            constructive: 40,
            technical: 10,
            controversial: 50
        },
        summary: [
            "美联储维持高利率，科技公司融资成本剧增。",
            "大量未盈利的 SaaS 公司面临倒闭风险。",
            "裁员潮可能会持续到 2026 年底。"
        ],
        interpretation: [
            "只有真正能产生现金流的硬核科技公司才能生存。",
            "对于求职者来说，选择业务稳健的大厂比独角兽更安全。",
            "VC 的投资逻辑发生了根本性转变：从增长优先到利润优先。"
        ],
        aiComments: [
            "终于回归理性了，之前的泡沫太疯狂了。",
            "硬件和 AI 基础设施公司似乎不受影响？",
            "作为创业者，现在拿钱太难了，估值被砍了一半以上。"
        ],
        keywords: ["Economy", "Interest Rates", "Tech Bubble", "VC"]
    },
    {
        id: 3920194,
        title: "Show HN: I built a browser engine in Rust",
        titleZh: "Show HN: 我用 Rust 写了一个浏览器引擎",
        url: "https://github.com/rust-browser/engine",
        domain: "github.com",
        score: 1200,
        by: "rustacean_01",
        time: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
        descendants: 85,
        category: "开源项目",
        sentiment: {
            constructive: 80,
            technical: 20,
            controversial: 0
        },
        summary: [
            "基于 Servo 架构的简化版实现。",
            "实现了基本的 HTML5 解析和 CSS3 渲染。",
            "性能比 Chrome 的 Blink 引擎在特定场景快 20%。"
        ],
        interpretation: [
            "虽然离实用还很远，但展示了 Rust 在系统编程的潜力。",
            "适合用来学习浏览器工作原理的教学项目。",
            "作者的代码质量非常高，值得阅读。"
        ],
        aiComments: [
            "这是我见过最干净的 Rust 代码之一！",
            "Servo 项目死而复生了吗？",
            "希望能支持 WebAssembly。"
        ],
        keywords: ["Rust", "Browser", "Engine", "Servo"]
    },
    {
        id: 3920195,
        title: "Understanding Transformer Architecture through visualization",
        titleZh: "通过可视化理解 Transformer 架构",
        url: "https://bbycroft.net/llm",
        domain: "bbycroft.net",
        score: 670,
        by: "viz_master",
        time: Math.floor(Date.now() / 1000) - 86400, // 1 day ago
        descendants: 56,
        category: "人工智能",
        sentiment: {
            constructive: 90,
            technical: 10,
            controversial: 0
        },
        summary: [
            "3D 交互式演示 LLM 的推理过程。",
            "清晰展示了 Attention 机制的权重分配。",
            "无需数学背景也能看懂神经网络在做什么。"
        ],
        interpretation: [
            "最好的 AI 扫盲教程，没有之一。",
            "揭示了 AI 并非'黑盒'，而是可解释的数学运算。",
            "适合用来给老板演示为什么我们需要那么多 GPU。"
        ],
        aiComments: [
            "这个网站在 iPad 上跑起来也很快，优化做得真好。",
            "终于明白 Self-Attention 是怎么回事了。",
            "希望能加入更多模型（如 MoE）的可视化。"
        ],
        keywords: ["AI", "Transformer", "Visualization", "Education"]
    },
    {
        id: 3920196,
        title: "Ask HN: Who is hiring? (January 2026)",
        titleZh: "Ask HN: 谁在招聘？(2026年1月)",
        url: "", // Internal
        domain: "",
        score: 800,
        by: "whoishiring",
        time: Math.floor(Date.now() / 1000) - 400000,
        descendants: 900,
        category: "职场生涯",
        sentiment: {
            constructive: 50,
            technical: 0,
            controversial: 50
        },
        summary: [
            "本月招聘贴。",
            "远程岗位明显减少。",
            "AI 相关岗位占据了半壁江山。"
        ],
        interpretation: [
            "普通前后端开发的岗位竞争极其惨烈。",
            "薪资两极分化：AI 专家年薪百万，普通开发不如两年前。",
            "可以看出市场正在缓慢复苏，但方向变了。"
        ],
        aiComments: [
            "投了 50 份简历，只有 2 个回音...",
            "这时候还在招人的公司才是真有钱。",
            "Remote work is dying."
        ],
        keywords: ["Hiring", "Jobs", "Remote", "Career"]
    },
    {
        id: 3920197,
        title: "Linux kernel 6.14 released with new scheduler",
        titleZh: "Linux 内核 6.14 发布：引入全新调度器",
        url: "https://kernel.org/",
        domain: "kernel.org",
        score: 310,
        by: "torvalds",
        time: Math.floor(Date.now() / 1000) - 10000,
        descendants: 88,
        category: "系统硬核",
        sentiment: {
            constructive: 60,
            technical: 35,
            controversial: 5
        },
        summary: [
            "EEVDF 调度器彻底取代了 CFS。",
            "对混合架构 (大小核) 的支持有了质的飞跃。",
            "文件系统性能提升 15%。"
        ],
        interpretation: [
            "这是 Linux 内核近五年来最大的调度层变动。",
            "服务器用户建议观望，桌面用户可以尝鲜。",
            "为未来的千核 CPU 时代做好了准备。"
        ],
        aiComments: [
            "Linus 还是那么犀利，ChangeLog 写得太搞笑了。",
            "终于等到 EEVDF 了！",
            "Debian 什么时候能进 Stable？"
        ],
        keywords: ["Linux", "Kernel", "Scheduler", "OS"]
    }
];
