import Container from '../Container';
import { Mod } from '../../mods';
import { TagProps, BaseItemTypeProps } from '../../schema';
import MetaData from '../../util/MetaData';
import Stat from '../../calculator/Stat';

import Component from './Component';
import ItemAffixes from './components/Affixes';
import ItemSockets, {
  Sockets,
  Builder as SocketsBuilder,
} from './components/Sockets';
import ItemName, { Name, Builder as NameBuilder } from './components/Name';
import ItemRarity, {
  Builder as RarityBuilder,
  Rarity,
  RarityKind,
} from './components/Rarity';
import Implicits from './components/Implicits';
import ItemRequirements, {
  Requirements,
  Builder as RequirementsBuilder,
} from './components/Requirements';
import ItemProperties, {
  Properties,
  Builder as PropertiesBuilder,
} from './components/properties/ItemProperties';

export interface ItemProps {
  readonly corrupted: boolean;
  readonly item_level: number;
  readonly mirrored: boolean;
  readonly sockets?: number;
}

export class UnacceptedMod extends Error {
  public type = 'UnacceptedMod';

  constructor() {
    super('Unacceptable mods passed to this Container');
  }
}

export interface Builder {
  affixes: Mod[];
  baseitem: BaseItemTypeProps;
  implicits: Mod[];
  meta_data: MetaData;
  name: NameBuilder;
  props: ItemProps;
  properties: PropertiesBuilder;
  rarity: RarityBuilder;
  requirements: RequirementsBuilder;
  sockets: SocketsBuilder;
}

const shallowEqual = (a: { [key: string]: any }, b: { [key: string]: any }) => {
  return a === b || Object.keys(a).every(key => a[key] === b[key]);
};

export default class Item implements Container<Mod> {
  public static build(baseitem: BaseItemTypeProps): Item {
    const clazz = String(baseitem.inherits_from.split(/[\\/]/).pop());
    const meta_data = MetaData.build(clazz);

    if (meta_data == null) {
      throw new Error(`meta_data for ${clazz} not found`);
    }

    const implicits = baseitem.implicit_mods.map(
      mod_props => new Mod(mod_props),
    );

    return new Item({
      affixes: [],
      baseitem,
      implicits,
      meta_data,
      name: 'Random Name',
      props: {
        // more like misc
        corrupted: false,
        item_level: 100,
        mirrored: false,
      },
      properties: null,
      rarity: RarityKind.normal,
      requirements: baseitem.component_attribute_requirement,
      sockets: 0,
    });
  }

  public static fromBuilder(builder: Builder): Item {
    return new Item(builder);
  }

  public affixes: ItemAffixes;
  public baseitem: BaseItemTypeProps;
  public implicits: Implicits;
  public meta_data: MetaData;
  public name: Name & Component<Item, NameBuilder>;
  public props: ItemProps;
  public properties: Properties & Component<Item, any>;
  public rarity: Rarity<Item> & Component<Item, RarityBuilder>;
  public requirements: Requirements & Component<Item, RequirementsBuilder>;
  public sockets: Sockets & Component<Item, SocketsBuilder>;

  constructor(builder: Builder) {
    this.baseitem = builder.baseitem;
    this.props = builder.props;
    this.meta_data = builder.meta_data;

    // components
    this.name = new ItemName(this, builder.name);
    this.properties = new ItemProperties(this, builder.properties);
    this.rarity = new ItemRarity(this, builder.rarity);
    this.requirements = new ItemRequirements(this, builder.requirements);
    this.sockets = new ItemSockets(this, builder.sockets);
    this.affixes = new ItemAffixes(this, builder.affixes);
    this.implicits = new Implicits(this, builder.implicits);
  }

  public withMutations(mutate: (builder: Builder) => Builder): this {
    const prev = this.builder();
    const mutated = mutate(prev);

    if (shallowEqual(prev, mutated)) {
      return this;
    } else {
      // @ts-ignore
      return this.constructor.fromBuilder(mutated);
    }
  }

  public builder(): Builder {
    return {
      affixes: this.affixes.mods,
      baseitem: this.baseitem,
      implicits: this.implicits.mods,
      meta_data: this.meta_data,
      name: this.name.builder(),
      props: this.props,
      properties: this.properties.builder(),
      rarity: this.rarity.builder(),
      requirements: this.requirements.builder(),
      sockets: this.sockets.builder(),
    };
  }

  // Taggable Implementation
  /**
   * returns tags of item + tags from mods
   */
  public getTags(): TagProps[] {
    return [
      ...this.meta_data.props.tags,
      ...this.baseitem.tags,
      ...this.implicits.getTags(),
      ...this.affixes.getTags(),
    ];
  }

  // Container implementtion
  get mods(): Mod[] {
    return [...this.implicits.mods, ...this.affixes.mods];
  }

  public asArray(): Mod[] {
    return this.mods;
  }

  public addMod(other: Mod): this {
    if (other.isAffix()) {
      return this.addAffix(other);
    } else if (other.implicitCandidate()) {
      return this.addImplicit(other);
    } else {
      throw new UnacceptedMod();
    }
  }

  public removeMod(other: Mod): this {
    if (other.isAffix()) {
      return this.removeAffix(other);
    } else if (other.implicitCandidate()) {
      return this.removeImplicit(other);
    } else {
      throw new UnacceptedMod();
    }
  }

  public removeAllMods(): this {
    return this.mutateAffixes(affixes => affixes.removeAllMods());
  }

  public hasMod(other: Mod): boolean {
    return this.affixes.hasMod(other) || this.implicits.hasMod(other);
  }

  public hasModGroup(other: Mod): boolean {
    return (
      // isAffix => this.affixes.hasModGroup(other)
      (!other.isAffix() || this.affixes.hasModGroup(other)) &&
      // implicitCandidate => this.implicits.hasModGroup(other)
      (!other.implicitCandidate() || this.implicits.hasModGroup(other))
    );
  }

  public hasRoomFor(other: Mod): boolean {
    return this.affixes.hasRoomFor(other) || this.implicits.hasRoomFor(other);
  }

  public indexOfModWithPrimary(primary: number): number {
    const affix_index = this.affixes.indexOfModWithPrimary(primary);
    const implicit_index = this.implicits.indexOfModWithPrimary(primary);

    if (affix_index !== -1) {
      return affix_index;
    } else if (implicit_index !== -1) {
      return implicit_index;
    } else {
      return -1;
    }
  }

  public maxModsOfType(other: Mod): number {
    if (other.isAffix()) {
      return this.affixes.maxModsOfType(other);
    } else if (other.implicitCandidate()) {
      return this.implicits.maxModsOfType(other);
    } else {
      throw new UnacceptedMod();
    }
  }

  public inDomainOf(mod_domain: number): boolean {
    return this.affixes.inDomainOf(mod_domain);
  }

  public level(): number {
    return this.props.item_level;
  }

  public any(): boolean {
    return this.mods.length > 0;
  }

  public stats(): { [key: string]: Stat } {
    // merge implicit stats and affix stats by adding its stats
    const a: { [key: string]: Stat } = this.implicits.stats();
    const b: { [key: string]: Stat } = this.affixes.stats();

    // assume that keys are unique
    return [
      ...Object.keys(a),
      ...Object.keys(b),
    ].reduce((stats: { [key: string]: Stat }, key: string) => {
      const left: Stat | undefined = a[key];
      const right: Stat | undefined = b[key];

      if (stats[key] != null) {
        // already merged
        return stats;
      } else {
        let merged: Stat;

        if (left != null && right != null) {
          merged = left.add(right.values);
        } else if (right != null) {
          merged = right;
        } else if (left != null) {
          merged = left;
        } else {
          // unreachable
          throw new Error('unreachable code');
        }

        return {
          ...stats,
          [key]: merged,
        };
      }
    }, {});
  }
  // End Container implementation

  public removeAllImplicits(): this {
    return this.mutateImplicits(implicits => implicits.removeAllMods());
  }

  // Begin state managment
  public setProperty(prop: keyof ItemProps, value: any): this {
    return this.withMutations(builder => {
      return {
        ...builder,
        props: {
          ...builder.props,
          [prop]: value,
        },
      };
    });
  }

  public corrupt(): this {
    if (this.props.corrupted) {
      throw new Error('invalid state: is already corrupted');
    } else {
      return this.setProperty('corrupted', true);
    }
  }

  public mirror(): this {
    if (this.props.mirrored) {
      throw new Error('invalid state: is already mirrored');
    } else {
      return this.setProperty('mirrored', true);
    }
  }
  // End state

  // private
  private mutateAffixes(mutate: (a: ItemAffixes) => ItemAffixes): this {
    return this.withMutations(builder => {
      return {
        ...builder,
        affixes: mutate(this.affixes).mods,
      };
    });
  }

  private addAffix(other: Mod): this {
    return this.mutateAffixes(affixes => affixes.addMod(other));
  }

  private removeAffix(other: Mod): this {
    return this.mutateAffixes(affixes => affixes.removeMod(other));
  }

  private mutateImplicits(mutate: (i: Implicits) => Implicits): this {
    return this.withMutations(builder => {
      return {
        ...builder,
        implicits: mutate(this.implicits).mods,
      };
    });
  }

  private addImplicit(other: Mod): this {
    return this.mutateImplicits(implicits => implicits.addMod(other));
  }

  private removeImplicit(other: Mod): this {
    return this.mutateImplicits(implicits => implicits.removeMod(other));
  }
}
