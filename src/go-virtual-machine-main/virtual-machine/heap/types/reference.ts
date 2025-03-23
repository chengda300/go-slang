

import { Heap, TAG } from '..'
import { BaseNode } from './base'
import { PrimitiveNode } from './primitives'

export class ReferenceNode extends BaseNode {

  static create(nodeAddr: number, heap: Heap): ReferenceNode {
    const addr = heap.allocate(2)
    heap.set_tag(addr, TAG.REFERENCE)
    heap.memory.set_number(nodeAddr, addr + 1)
    return new ReferenceNode(heap, addr)
  }

  set_child(address: number) {
    this.heap.memory.set_word(address, this.addr + 1)
  }

  get_child(): number {
    return this.heap.memory.get_word(this.addr + 1)
  }

  override toString(): string {
    const node = this.heap.get_value(this.get_child())
    if (node instanceof PrimitiveNode || node instanceof ReferenceNode) {
      return `0x${this.get_child().toString(16).padStart(8, '0')}`
    } else {
      return `&${node.toString()}`
    }
  }

  apply_unary(operator: string): BaseNode {
    if (operator === "indirection") {
      return this.heap.get_value(this.get_child())
    }
    if (operator === "address") {
      return ReferenceNode.create(
        this.addr,
        this.heap,
      )
    }
    throw Error('Invalid Operation')
  }
}
