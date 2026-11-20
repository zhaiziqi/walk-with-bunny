export type RabbitDirection = "front" | "right" | "back" | "left";
export type RabbitStance = "planted" | "crouch" | "airborne";
export type RabbitAtlasFrame = {uv:[number,number,number,number];width:number;height:number;footInset:number};
/** Measured alpha bounds; all poses use 0.46 world units per pixel. UV origin is bottom-left. */
export const rabbitAtlasFrames:Record<RabbitDirection,Record<RabbitStance,RabbitAtlasFrame>> = {
  "front": {
    "planted": {
      "uv": [
        0.0478515625,
        0.7447916666666667,
        0.27734375,
        0.9921875
      ],
      "width": 108.1,
      "height": 174.8,
      "footInset": 1.38
    },
    "crouch": {
      "uv": [
        0.3818359375,
        0.744140625,
        0.603515625,
        0.9576822916666666
      ],
      "width": 104.42,
      "height": 150.88,
      "footInset": 1.38
    },
    "airborne": {
      "uv": [
        0.7041015625,
        0.7473958333333333,
        0.9599609375,
        0.9921875
      ],
      "width": 120.52,
      "height": 172.96,
      "footInset": 1.38
    }
  },
  "right": {
    "planted": {
      "uv": [
        0.068359375,
        0.5091145833333333,
        0.31640625,
        0.7415364583333333
      ],
      "width": 116.84,
      "height": 164.22,
      "footInset": 1.38
    },
    "crouch": {
      "uv": [
        0.384765625,
        0.5091145833333333,
        0.6611328125,
        0.7220052083333333
      ],
      "width": 130.18,
      "height": 150.42,
      "footInset": 1.38
    },
    "airborne": {
      "uv": [
        0.71484375,
        0.5078125,
        0.994140625,
        0.7415364583333333
      ],
      "width": 131.56,
      "height": 165.14,
      "footInset": 1.38
    }
  },
  "back": {
    "planted": {
      "uv": [
        0.0791015625,
        0.26692708333333337,
        0.310546875,
        0.5032552083333333
      ],
      "width": 109.02,
      "height": 166.98,
      "footInset": 1.38
    },
    "crouch": {
      "uv": [
        0.4072265625,
        0.26692708333333337,
        0.64453125,
        0.47135416666666663
      ],
      "width": 111.78,
      "height": 144.44,
      "footInset": 1.38
    },
    "airborne": {
      "uv": [
        0.7314453125,
        0.267578125,
        0.98046875,
        0.50390625
      ],
      "width": 117.3,
      "height": 166.98,
      "footInset": 1.38
    }
  },
  "left": {
    "planted": {
      "uv": [
        0.0458984375,
        0.02604166666666663,
        0.2939453125,
        0.26171875
      ],
      "width": 116.84,
      "height": 166.52,
      "footInset": 1.38
    },
    "crouch": {
      "uv": [
        0.365234375,
        0.02604166666666663,
        0.6396484375,
        0.24153645833333337
      ],
      "width": 129.26,
      "height": 152.26,
      "footInset": 1.38
    },
    "airborne": {
      "uv": [
        0.7001953125,
        0.02799479166666663,
        0.9794921875,
        0.26171875
      ],
      "width": 131.56,
      "height": 165.14,
      "footInset": 1.38
    }
  }
};
