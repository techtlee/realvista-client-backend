import * as migration_20261108_100819_baseline from './20261108_100819_baseline';

export const migrations = [
  {
    up: migration_20261108_100819_baseline.up,
    down: migration_20261108_100819_baseline.down,
    name: '20261108_100819_baseline'
  },
];
