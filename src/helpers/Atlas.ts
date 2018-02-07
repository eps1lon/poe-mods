import AtlasNode from '../containers/AtlasNode';
import Sextant from '../generators/Sextant';
import Mod from '../mods/Mod';
import { AtlasNodeProps } from '../schema';

type HumanId = string;

type AtlasNodes = Map<HumanId, AtlasNode>;

interface Builder {
  nodes: AtlasNodes;
}

type AtlasSextant = Sextant; // sextant.atlas defined

/**
 * immutable data structure for the atlas in Path of Exile
 * 
 * main purpose is for reducer like usage in redux
 */
export default class Atlas {
  public static buildLookupTable(atlas: AtlasNodeProps[]): AtlasNodes {
    return atlas.reduce((nodes, props) => {
      return nodes.set(AtlasNode.humanId(props), new AtlasNode([], props));
    }, new Map());
  }

  public static build(atlas: AtlasNodeProps[]): Atlas {
    const nodes: AtlasNodes = Atlas.buildLookupTable(atlas);

    return new Atlas(nodes);
  }

  public static withBuilder(builder: Builder): Atlas {
    return new Atlas(builder.nodes);
  }

  public readonly nodes: AtlasNodes;

  constructor(nodes: AtlasNodes) {
    this.nodes = nodes;
  }

  // TODO in the future use [Symbol.iterator]()
  public asArray(): AtlasNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * wrapper for map get that ensures a node or throws
   */
  public get(id: HumanId): AtlasNode {
    const node = this.nodes.get(id);

    if (node == null) {
      throw new Error(`IndexError: '${id}' not found`);
    }

    return node;
  }

  public builder(): Builder {
    return {
      nodes: this.nodes,
    };
  }

  /**
   * batch mutations
   * 
   * if the returned object is strict equal to the prev one
   * it doesn't return a new copy
   */
  public withMutations(mutate: (builder: Builder) => Builder): this {
    const prev = this.builder();
    const next = mutate(prev);

    if (prev !== next) {
      // @ts-ignore
      return this.constructor.withBuilder(next);
    } else {
      return this;
    }
  }

  /**
   * removes mods on all maps
   * 
   * always returns a new copy
   */
  public reset(): this {
    return this.withMutations(({ nodes, ...builder }) => {
      return {
        ...builder,
        nodes: Atlas.buildLookupTable(
          this.asArray().map(node => node.removeAllMods().props),
        ),
      };
    });
  }

  public addMod(mod: Mod, node_id: HumanId): this {
    return this.mutateNode(node_id, node => node.addMod(mod));
  }

  public removeMod(mod: Mod, node_id: HumanId): this {
    return this.mutateNode(node_id, node => node.removeMod(mod));
  }

  public mutateNode(
    node_id: HumanId,
    mutate: (node: AtlasNode) => AtlasNode,
  ): this {
    const target = this.get(node_id);
    const mutated = mutate(target);

    if (target === mutated) {
      return this;
    } else {
      return this.withMutations(({ nodes, ...builder }) => {
        return {
          ...builder,
          nodes: new Map(nodes).set(node_id, mutated),
        };
      });
    }
  }

  public applySextant(sextant: Sextant, node_id: HumanId): this {
    const sextant_on_atlas = this.prepareSextant(sextant);

    return this.mutateNode(node_id, node => sextant_on_atlas.applyTo(node));
  }

  public modsFor(sextant: Sextant, node_id: HumanId) {
    const sextant_on_atlas = this.prepareSextant(sextant);

    return sextant_on_atlas.modsFor(this.get(node_id));
  }

  public blockedMods(node_id: HumanId): Mod[] {
    const target = this.get(node_id);

    return Sextant.blockedMods(target, this.asArray());
  }

  private prepareSextant(sextant: Sextant): AtlasSextant {
    const clone = new Sextant(sextant.mods);

    clone.type = sextant.type;
    clone.atlas = this.asArray();

    return clone;
  }
}
