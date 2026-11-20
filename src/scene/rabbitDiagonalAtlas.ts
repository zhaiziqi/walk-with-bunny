import type { RabbitAtlasFrame, RabbitStance } from './rabbitAtlas';
export type RabbitDiagonalDirection = 'frontRight'|'backRight'|'backLeft'|'frontLeft';
/** Original watercolor diagonal poses. Connected alpha bounds, 0.46 world units/pixel. */
export const rabbitDiagonalFrames: Record<RabbitDiagonalDirection, Record<RabbitStance, RabbitAtlasFrame>> = {
  "frontRight": {
    "planted": {
      "uv": [
        0.0830078125,
        0.7513020833333334,
        0.3037109375,
        0.98046875
      ],
      "width": 103.96,
      "height": 161.92,
      "footInset": 1.38
    },
    "crouch": {
      "uv": [
        0.369140625,
        0.75,
        0.6240234375,
        0.939453125
      ],
      "width": 120.06,
      "height": 133.86,
      "footInset": 1.38
    },
    "airborne": {
      "uv": [
        0.6787109375,
        0.7486979166666667,
        0.943359375,
        0.9811197916666666
      ],
      "width": 124.66,
      "height": 164.22,
      "footInset": 1.38
    }
  },
  "backRight": {
    "planted": {
      "uv": [
        0.0947265625,
        0.5130208333333333,
        0.3388671875,
        0.73828125
      ],
      "width": 115.0,
      "height": 159.16,
      "footInset": 1.38
    },
    "crouch": {
      "uv": [
        0.3935546875,
        0.5130208333333333,
        0.654296875,
        0.7109375
      ],
      "width": 122.82,
      "height": 139.84,
      "footInset": 1.38
    },
    "airborne": {
      "uv": [
        0.69921875,
        0.51171875,
        0.9736328125,
        0.7369791666666667
      ],
      "width": 129.26,
      "height": 159.16,
      "footInset": 1.38
    }
  },
  "backLeft": {
    "planted": {
      "uv": [
        0.0595703125,
        0.27018229166666663,
        0.3046875,
        0.49869791666666663
      ],
      "width": 115.46,
      "height": 161.46,
      "footInset": 1.38
    },
    "crouch": {
      "uv": [
        0.3583984375,
        0.26953125,
        0.6337890625,
        0.46744791666666663
      ],
      "width": 129.72,
      "height": 139.84,
      "footInset": 1.38
    },
    "airborne": {
      "uv": [
        0.6796875,
        0.26627604166666663,
        0.9609375,
        0.49283854166666663
      ],
      "width": 132.48,
      "height": 160.08,
      "footInset": 1.38
    }
  },
  "frontLeft": {
    "planted": {
      "uv": [
        0.0673828125,
        0.02994791666666663,
        0.3056640625,
        0.25846354166666663
      ],
      "width": 112.24,
      "height": 161.46,
      "footInset": 1.38
    },
    "crouch": {
      "uv": [
        0.3662109375,
        0.02994791666666663,
        0.62890625,
        0.22916666666666663
      ],
      "width": 123.74,
      "height": 140.76,
      "footInset": 1.38
    },
    "airborne": {
      "uv": [
        0.6806640625,
        0.03190104166666663,
        0.96875,
        0.26236979166666663
      ],
      "width": 135.7,
      "height": 162.84,
      "footInset": 1.38
    }
  }
};
