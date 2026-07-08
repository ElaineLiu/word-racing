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
   * 上海国际赛车场 v2 - 默认赛道（高速 GP 风格）
   * 超长主直道 + 大圆弧高速弯 + 一处发卡，模仿 F1 上赛特征
   * 画布: 1400×800
   */
  'shanghai-2d': {
    id: 'shanghai-2d',
    name: 'Shanghai International Circuit',
    type: '2d',
    description: 'High-speed F1 circuit with a long main straight',
    waypoints: [
      // 主直道
      { x: 250, y: 90 },
      { x: 560, y: 75 },
      { x: 900, y: 80 },
      { x: 1160, y: 130 },

      // 右侧高速大弯
      { x: 1300, y: 260 },
      { x: 1280, y: 430 },
      { x: 1120, y: 545 },
      { x: 880, y: 620 },
      { x: 660, y: 620 },

      // 下方 S 弯
      { x: 520, y: 560 },
      { x: 380, y: 630 },
      { x: 230, y: 575 },

      // 左下发卡
      { x: 100, y: 650 },
      { x: 60, y: 520 },
      { x: 135, y: 400 },
      { x: 300, y: 350 },

      // 内侧 S 弯回主直道
      { x: 445, y: 455 },
      { x: 610, y: 355 },
      { x: 540, y: 255 },
      { x: 370, y: 205 },
    ],
    trackWidth: 90,
    unlockRequirements: { quizzesCompleted: 1 }
  },

  /**
   * 蒙特卡洛街道赛 v2
   * 零长直 + 2 发卡 + 2 组 S 弯 + 极窄街道
   * 画布: 1400×800
   */
  'monaco-2d': {
    id: 'monaco-2d',
    name: 'Monte Carlo Street Circuit',
    type: '2d',
    description: 'Narrow street circuit with dense corners',
    waypoints: [
      // 起步直道（极短）
      { x: 200, y: 100 },
      { x: 380, y: 105 },

      // Sainte Devote 急右弯
      { x: 480, y: 130 },
      { x: 540, y: 200 },
      { x: 560, y: 280 },

      // Beau Rivage 短上坡
      { x: 620, y: 320 },
      { x: 740, y: 340 },

      // Massenet 左弯
      { x: 830, y: 370 },
      { x: 850, y: 430 },

      // Mirabeau 右弯
      { x: 880, y: 500 },

      // Grand Hotel 发卡（极紧 3 点）
      { x: 920, y: 550 },
      { x: 935, y: 590 },
      { x: 900, y: 620 },

      // Portier + Tunnel
      { x: 830, y: 600 },
      { x: 760, y: 570 },
      { x: 700, y: 590 },

      // Nouvelle Chicane S 弯
      { x: 640, y: 630 },
      { x: 580, y: 670 },
      { x: 520, y: 640 },
      { x: 460, y: 670 },

      // Tabac
      { x: 400, y: 700 },

      // 泳池 S 弯
      { x: 340, y: 730 },
      { x: 270, y: 710 },
      { x: 230, y: 740 },
      { x: 170, y: 700 },

      // Rascasse 发卡
      { x: 140, y: 630 },
      { x: 120, y: 570 },
      { x: 160, y: 510 },

      // Antony Noghes 爬坡回起点
      { x: 250, y: 450 },
      { x: 230, y: 340 },
      { x: 230, y: 220 },
    ],
    trackWidth: 50,
    unlockRequirements: {
      // 与成就 'quiz-master-10' 对齐：累计完成 10 套题
      quizzesCompleted: 10
    }
  },

  /**
   * 银石赛道
   * 高速弯道挑战，适合升级后的赛车
   * 画布: 1400×800
   */
  'silverstone-2d': {
    id: 'silverstone-2d',
    name: 'Silverstone Circuit',
    type: '2d',
    description: 'High-speed corner challenge',
    waypoints: [
      { x: 713, y: 500 },
      { x: 648, y: 468 },
      { x: 625, y: 413 },
      { x: 612, y: 336 },
      { x: 576, y: 290 },
      { x: 538, y: 260 },
      { x: 502, y: 225 },
      { x: 474, y: 170 },
      { x: 438, y: 174 },
      { x: 408, y: 214 },
      { x: 377, y: 264 },
      { x: 344, y: 323 },
      { x: 304, y: 397 },
      { x: 271, y: 447 },
      { x: 251, y: 492 },
      { x: 250, y: 539 },
      { x: 277, y: 555 },
      { x: 352, y: 600 },
      { x: 385, y: 645 },
      { x: 344, y: 684 },
      { x: 280, y: 714 },
      { x: 240, y: 717 },
      { x: 200, y: 680 },
      { x: 155, y: 605 },
      { x: 137, y: 529 },
      { x: 123, y: 477 },
      { x: 87, y: 355 },
      { x: 66, y: 293 },
      { x: 59, y: 257 },
      { x: 159, y: 182 },
      { x: 288, y: 132 },
      { x: 336, y: 121 },
      { x: 367, y: 99 },
      { x: 389, y: 77 },
      { x: 404, y: 44 },
      { x: 441, y: 42 },
      { x: 470, y: 65 },
      { x: 512, y: 71 },
      { x: 543, y: 32 },
      { x: 573, y: 18 },
      { x: 636, y: 73 },
      { x: 746, y: 113 },
      { x: 845, y: 144 },
      { x: 989, y: 180 },
      { x: 1124, y: 235 },
      { x: 1134, y: 298 },
      { x: 1063, y: 373 },
      { x: 995, y: 467 },
      { x: 1061, y: 530 },
      { x: 1028, y: 615 },
      { x: 846, y: 551 }
    ],
    trackWidth: 90,  // 高速赛道（与上海同宽）
    unlockRequirements: {
      quizzesCompleted: 20
    }
  },

  // ========== 3D 赛道 ==========

  /**
   * 上海国际赛车场 3D
   * 沉浸式3D驾驶体验
   */
  'shanghai-3d': {
    id: 'shanghai-3d',
    name: 'Shanghai International Circuit 3D',
    type: '3d',
    description: 'Immersive 3D driving experience',
    waypoints: [
      { x: 250, y: 90 },
      { x: 560, y: 75 },
      { x: 900, y: 80 },
      { x: 1160, y: 130 },
      { x: 1300, y: 260 },
      { x: 1280, y: 430 },
      { x: 1120, y: 545 },
      { x: 880, y: 620 },
      { x: 660, y: 620 },
      { x: 520, y: 560 },
      { x: 380, y: 630 },
      { x: 230, y: 575 },
      { x: 100, y: 650 },
      { x: 60, y: 520 },
      { x: 135, y: 400 },
      { x: 300, y: 350 },
      { x: 445, y: 455 },
      { x: 610, y: 355 },
      { x: 540, y: 255 },
      { x: 370, y: 205 },
    ],
    trackWidth: 90,
    unlockRequirements: {
      quizzesCompleted: 30
    },
    sceneConfig: {
      camera: {
        fov: 75,
        near: 0.1,
        far: 2000,
        position: [700, 650, 900]
      },
      lighting: {
        ambientColor: 0x606060,
        directionalColor: 0xffffff,
        directionalPosition: [300, 600, 400]
      }
    }
  },

  /**
   * 蒙特卡洛街道赛 3D
   * 沉浸式3D驾驶体验
   */
  'monaco-3d': {
    id: 'monaco-3d',
    name: 'Monte Carlo Street Circuit 3D',
    type: '3d',
    description: 'Immersive 3D driving experience',
    waypoints: [
      // 起步直道（极短）
      { x: 200, y: 100 },
      { x: 380, y: 105 },

      // Sainte Devote 急右弯
      { x: 480, y: 130 },
      { x: 540, y: 200 },
      { x: 560, y: 280 },

      // Beau Rivage 短上坡
      { x: 620, y: 320 },
      { x: 740, y: 340 },

      // Massenet 左弯
      { x: 830, y: 370 },
      { x: 850, y: 430 },

      // Mirabeau 右弯
      { x: 880, y: 500 },

      // Grand Hotel 发卡（极紧 3 点）
      { x: 920, y: 550 },
      { x: 935, y: 590 },
      { x: 900, y: 620 },

      // Portier + Tunnel
      { x: 830, y: 600 },
      { x: 760, y: 570 },
      { x: 700, y: 590 },

      // Nouvelle Chicane S 弯
      { x: 640, y: 630 },
      { x: 580, y: 670 },
      { x: 520, y: 640 },
      { x: 460, y: 670 },

      // Tabac
      { x: 400, y: 700 },

      // 泳池 S 弯
      { x: 340, y: 730 },
      { x: 270, y: 710 },
      { x: 230, y: 740 },
      { x: 170, y: 700 },

      // Rascasse 发卡
      { x: 140, y: 630 },
      { x: 120, y: 570 },
      { x: 160, y: 510 },

      // Antony Noghes 爬坡回起点
      { x: 250, y: 450 },
      { x: 230, y: 340 },
      { x: 230, y: 220 },
    ],
    trackWidth: 50,
    unlockRequirements: {
      quizzesCompleted: 50
    },
    sceneConfig: {
      camera: {
        fov: 75,
        near: 0.1,
        far: 2000,
        position: [700, 650, 900]
      },
      lighting: {
        ambientColor: 0x606060,
        directionalColor: 0xffffff,
        directionalPosition: [300, 600, 400]
      }
    }
  },

  /**
   * 银石赛道 3D
   * 沉浸式3D驾驶体验
   */
  'silverstone-3d': {
    id: 'silverstone-3d',
    name: 'Silverstone Circuit 3D',
    type: '3d',
    description: 'Immersive 3D driving experience',
    waypoints: [
      { x: 713, y: 500 },
      { x: 648, y: 468 },
      { x: 625, y: 413 },
      { x: 612, y: 336 },
      { x: 576, y: 290 },
      { x: 538, y: 260 },
      { x: 502, y: 225 },
      { x: 474, y: 170 },
      { x: 438, y: 174 },
      { x: 408, y: 214 },
      { x: 377, y: 264 },
      { x: 344, y: 323 },
      { x: 304, y: 397 },
      { x: 271, y: 447 },
      { x: 251, y: 492 },
      { x: 250, y: 539 },
      { x: 277, y: 555 },
      { x: 352, y: 600 },
      { x: 385, y: 645 },
      { x: 344, y: 684 },
      { x: 280, y: 714 },
      { x: 240, y: 717 },
      { x: 200, y: 680 },
      { x: 155, y: 605 },
      { x: 137, y: 529 },
      { x: 123, y: 477 },
      { x: 87, y: 355 },
      { x: 66, y: 293 },
      { x: 59, y: 257 },
      { x: 159, y: 182 },
      { x: 288, y: 132 },
      { x: 336, y: 121 },
      { x: 367, y: 99 },
      { x: 389, y: 77 },
      { x: 404, y: 44 },
      { x: 441, y: 42 },
      { x: 470, y: 65 },
      { x: 512, y: 71 },
      { x: 543, y: 32 },
      { x: 573, y: 18 },
      { x: 636, y: 73 },
      { x: 746, y: 113 },
      { x: 845, y: 144 },
      { x: 989, y: 180 },
      { x: 1124, y: 235 },
      { x: 1134, y: 298 },
      { x: 1063, y: 373 },
      { x: 995, y: 467 },
      { x: 1061, y: 530 },
      { x: 1028, y: 615 },
      { x: 846, y: 551 }
    ],
    trackWidth: 70,
    unlockRequirements: {
      quizzesCompleted: 100
    },
    sceneConfig: {
      camera: {
        fov: 75,
        near: 0.1,
        far: 2000,
        position: [700, 650, 900]
      },
      lighting: {
        ambientColor: 0x606060,
        directionalColor: 0xffffff,
        directionalPosition: [300, 600, 400]
      }
    }
  },

  /**
   * 新加坡夜赛 3D
   * 夜景灯光秀（待实现）
   */
  'night-race-3d': {
    id: 'night-race-3d',
    name: 'Singapore Night Circuit 3D',
    type: '3d',
    description: 'Night race light show',
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
