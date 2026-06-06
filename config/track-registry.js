/**
 * 赛道注册表 - Track Registry
 *
 * 定义所有可用赛道的配置和数据
 */

/**
 * 赛道对象结构
 * @typedef {Object} Track
 * @property {string} id - 唯一标识
 * @property {string} name - 显示名称
 * @property {string} type - 类型：'2d' | '3d'
 * @property {string} description - 描述
 * @property {number} cost - 燃油币消耗
 * @property {Array<Object>} [waypoints] - 2D赛道坐标点
 * @property {number} [trackWidth] - 2D赛道宽度
 * @property {Object} [sceneConfig] - 3D场景配置
 */

export const TRACK_REGISTRY = {
  // ========== 2D 赛道 ==========

  /**
   * 上海国际赛车场 - 默认赛道
   * 经典F1赛道，平衡的弯道和直道
   */
  'shanghai-2d': {
    id: 'shanghai-2d',
    name: '上海国际赛车场',
    type: '2d',
    description: '经典F1赛道',
    cost: 10,
    waypoints: [
      { x: 180, y: 180 },  // Start/finish area
      { x: 350, y: 160 },
      { x: 520, y: 155 },
      { x: 660, y: 170 },
      { x: 740, y: 220 },  // Turn 1
      { x: 770, y: 300 },
      { x: 760, y: 380 },  // Turn 1 exit
      { x: 720, y: 430 },  // Turn 2 entry
      { x: 640, y: 465 },  // Turn 2 apex
      { x: 540, y: 475 },  // Back straight
      { x: 420, y: 470 },
      { x: 340, y: 455 },  // Hairpin entry
      { x: 290, y: 430 },
      { x: 270, y: 390 },  // Hairpin apex
      { x: 280, y: 350 },  // Hairpin exit
      { x: 310, y: 320 },  // S-curve entry
      { x: 270, y: 285 },  // S-curve mid 1
      { x: 220, y: 270 },  // S-curve mid 2
      { x: 175, y: 250 },  // S-curve exit
    ],
    trackWidth: 76
  },

  /**
   * 蒙特卡洛街道赛
   * 狭窄曲折的城市赛道，考验精准操控
   */
  'monaco-2d': {
    id: 'monaco-2d',
    name: '蒙特卡洛街道赛',
    type: '2d',
    description: '狭窄曲折的城市赛道',
    cost: 15,
    waypoints: [
      { x: 150, y: 150 },  // Start
      { x: 300, y: 140 },
      { x: 450, y: 150 },  // 直道
      { x: 550, y: 180 },  // 第一个弯
      { x: 600, y: 250 },
      { x: 580, y: 350 },  // 急弯
      { x: 520, y: 420 },  // 发卡弯
      { x: 420, y: 450 },
      { x: 300, y: 440 },  // 回直道
      { x: 200, y: 400 },  // S弯
      { x: 150, y: 350 },
      { x: 180, y: 280 },  // 最后弯道
      { x: 200, y: 200 },
    ],
    trackWidth: 60  // 更窄
  },

  /**
   * 银石赛道
   * 高速弯道挑战，适合升级后的赛车
   */
  'silverstone-2d': {
    id: 'silverstone-2d',
    name: '银石赛道',
    type: '2d',
    description: '高速弯道挑战',
    cost: 20,
    waypoints: [
      { x: 200, y: 200 },  // Start
      { x: 400, y: 180 },
      { x: 600, y: 200 },  // 长直道
      { x: 750, y: 250 },  // Copse弯
      { x: 800, y: 350 },
      { x: 780, y: 450 },  // Becketts
      { x: 700, y: 500 },  // 急弯组
      { x: 550, y: 520 },
      { x: 400, y: 500 },  // Stowe
      { x: 300, y: 450 },
      { x: 250, y: 350 },  // Club
      { x: 220, y: 280 },
      { x: 200, y: 220 },  // 回到起点
    ],
    trackWidth: 80  // 更宽
  },

  // ========== 3D 赛道 ==========

  /**
   * 上海国际赛车场 3D
   * 沉浸式3D驾驶体验（待实现）
   */
  'shanghai-3d': {
    id: 'shanghai-3d',
    name: '上海国际赛车场 3D',
    type: '3d',
    description: '沉浸式3D驾驶体验',
    cost: 30,
    sceneConfig: {
      // Three.js 场景配置（待实现）
      camera: {
        fov: 75,
        near: 0.1,
        far: 1000
      },
      lighting: {
        ambient: 0x404040,
        directional: 0xffffff
      },
      // 其他3D配置...
    }
  },

  /**
   * 新加坡夜赛 3D
   * 夜景灯光秀（待实现）
   */
  'night-race-3d': {
    id: 'night-race-3d',
    name: '新加坡夜赛 3D',
    type: '3d',
    description: '夜景灯光秀',
    cost: 50,
    sceneConfig: {
      // Three.js 场景配置（待实现）
      camera: {
        fov: 75,
        near: 0.1,
        far: 1000
      },
      lighting: {
        ambient: 0x202020,  // 更暗的环境光
        directional: 0xffffcc,  // 暖色调灯光
        neon: true  // 霓虹灯效果
      }
    }
  }
};
