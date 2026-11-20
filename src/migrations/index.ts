import * as migration_20261104_173711_initial_uuid from './20261104_173711_initial_uuid';
import * as migration_20261105_200823_ecommerce_conversion from './20261105_200823_ecommerce_conversion';
import * as migration_20261119_212625_testimonials from './20261119_212625_testimonials';

export const migrations = [
  {
    up: migration_20261104_173711_initial_uuid.up,
    down: migration_20261104_173711_initial_uuid.down,
    name: '20261104_173711_initial_uuid',
  },
  {
    up: migration_20261105_200823_ecommerce_conversion.up,
    down: migration_20261105_200823_ecommerce_conversion.down,
    name: '20261105_200823_ecommerce_conversion',
  },
  {
    up: migration_20261119_212625_testimonials.up,
    down: migration_20261119_212625_testimonials.down,
    name: '20261119_212625_testimonials'
  },
];
