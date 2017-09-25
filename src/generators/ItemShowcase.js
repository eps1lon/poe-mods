// @flow
import type { Item } from '../containers';
import MasterBench from '../helpers/MasterBench';
import { Mod } from '../mods';
import type { CraftingBenchOptionsProps, ModProps } from '../schema';

import Generator, { type GeneratorDetails } from './Generator';
import { EnchantmentBench, Transmute, Vaal } from './item_orbs/';

/**
 * Masterbench/Currency hybrid
 */
export default class ItemShowcase extends Generator<Mod, Item> {
  enchantment: EnchantmentBench;
  master: MasterBench;
  transmute: Transmute;
  vaal: Vaal;

  constructor(props: ModProps[], options: CraftingBenchOptionsProps[]) {
    const enchantment = EnchantmentBench.build(props);
    const master = MasterBench.build(options);
    const transmute = Transmute.build(props);
    const vaal = Vaal.build(props);

    const mods = [
      ...enchantment.mods,
      ...transmute.mods,
      ...vaal.mods,
      ...master.getAvailableMods(),
    ];

    super(mods);

    this.enchantment = enchantment;
    this.master = master;
    this.transmute = transmute;
    this.vaal = vaal;
  }

  /**
   * only abstract showcase, not for actual usage
   */
  applyTo(item: Item) {
    return item;
  }

  /**
   * greps mod::applicableTo and (if implemented) mod::spawnableOn 
   * if we have all the space for mods we need
   */
  modsFor(item: Item, whitelist: string[] = []) {
    const details = [
      ...this.master.modsFor(item, whitelist),
      ...this.enchantment.modsFor(item, whitelist),
      ...this.transmute.modsFor(item, whitelist),
      ...this.vaal.modsFor(item, whitelist),
    ];

    // flow cant merge object types
    // { mod: OneMod, prop: number } | { mod: AnotherMod, prop: number }
    // will not become { mod: OneMod | AnotherMod, prop: number }
    // and for some reason ['a', 'b'] cant be cast to Array<number | string>
    return ((details: any): GeneratorDetails<Mod>[]);
  }
}
