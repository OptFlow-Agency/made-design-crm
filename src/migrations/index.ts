import * as migration_20261104_173711_initial_uuid from './20261104_173711_initial_uuid';

export const migrations = [
  {
    up: migration_20261104_173711_initial_uuid.up,
    down: migration_20261104_173711_initial_uuid.down,
    name: '20261104_173711_initial_uuid'
  },
];
