import Vaal from '../Vaal';
import { Item } from '../../containers/';
import { findByPrimary } from '../../__fixtures__/util';

const baseitemtypes = require('../../__fixtures__/baseitemtypes.json');
const meta_datas = require('../../__fixtures__/meta_data.json');
const mods = require('../../__fixtures__/mods.json');

const greaves = Item.build(findByPrimary(baseitemtypes, 1650), meta_datas);

it('should build', () => {
  const vaal = Vaal.build(mods);

  expect(vaal).toBeInstanceOf(Vaal);
  expect(vaal.mods.length).toBeGreaterThan(0);
});

it('should only have vaal mods', () => {
  const vaal = Vaal.build(mods);

  expect(vaal.getAvailableMods().every(mod => mod.implicitCandidate())).toBe(
    true,
  );
});

it('should add an implicit while corrupting', () => {
  const vaal = Vaal.build(mods);
  const craftable = greaves;

  const crafted = vaal.applyTo(craftable);

  expect(crafted).not.toBe(craftable);
  expect(crafted.props.corrupted).toBe(true);
  expect(crafted.implicits).not.toBe(craftable.implicits);
  expect(crafted.implicits.mods).toHaveLength(1);
});
