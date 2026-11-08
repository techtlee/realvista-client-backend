import * as migration_20261108_100819_baseline from './20261108_100819_baseline';
import * as migration_20261108_130325_hero_portrait from './20261108_130325_hero_portrait';

export const migrations = [
  {
    up: migration_20261108_100819_baseline.up,
    down: migration_20261108_100819_baseline.down,
    name: '20261108_100819_baseline',
  },
  {
    up: migration_20261108_130325_hero_portrait.up,
    down: migration_20261108_130325_hero_portrait.down,
    name: '20261108_130325_hero_portrait'
  },
];
