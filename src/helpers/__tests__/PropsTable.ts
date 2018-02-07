import MasterBenchOption from '../../generators/MasterBenchOption';

import PropsTable from '../PropsTable';

// tslint:disable: no-var-requires
const all_options = require('../../__fixtures__/craftingbenchoptions.json');

it('should find props', () => {
  const table = new PropsTable(all_options, MasterBenchOption);

  expect(table.find(props => props.primary === 3)).toBeDefined();
  expect(table.find(() => false)).toBeUndefined();
  expect(table.find(props => props.master_level === 3)).toEqual(
    expect.any(Object),
  );
});

it('should throw when the entry was not found', () => {
  const table = new PropsTable(all_options, MasterBenchOption);

  expect(() => table.fromPrimary(-5)).toThrowError(
    "MasterBenchOption not found with primary '-5'",
  );
});

it('should have a fromPrimary finder', () => {
  const table = new PropsTable(all_options, MasterBenchOption);

  expect(table.fromPrimary(1)).toBeInstanceOf(MasterBenchOption);
});
