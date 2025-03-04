import { Process } from '../../runtime/process'
import { FrameNode } from '../../heap/types/environment'
import { ArrayType, BoolType, DeclaredType, StringType, StructType, Type } from '../typing'

import { Instruction } from './base'
import { PrimitiveTypeToken } from '../../compiler/tokens'
import { ArrayNode } from '../../heap/types/array'
import { StructNode } from '../../heap/types/struct'

export class BlockInstruction extends Instruction {
  frame: Type[] = []
  identifiers: string[] = []
  constructor(public name: string, public for_block = false) {
    super('BLOCK')
  }

  set_frame(frame: Type[]) {
    this.frame = [...frame]
  }

  set_identifiers(identifiers: string[]) {
    this.identifiers = [...identifiers]
  }

  override toString(): string {
    return super.toString() + ' ' + this.name
  }

  override execute(process: Process): void {
    // make structs contiguous too
    const new_frame = FrameNode.create(this.frame.length, process.heap)
    process.heap.temp_push(new_frame.addr)
    for (let i = 0; i < this.frame.length; i++) {
      const T = this.frame[i]
      if (T instanceof DeclaredType) {
        // Find underlying type to load default values into
        let actualType = T
        let nextType = T.type
        // TODO: Morph to support structs
        while (nextType[0] instanceof DeclaredType) {
          actualType = nextType[0]
          nextType = actualType.type
        }
        new_frame.set_idx(nextType[0].defaultNodeCreator()(process.heap), i)
      } else if (T instanceof ArrayType) {
        let dimensions = [] as number[]
        let length = T.length
        let next = T.element
        dimensions.push(length)
        while (next instanceof ArrayType) {
          dimensions.push(next.length)
          length = length * next.length
          next = next.element
        }
        if (next instanceof DeclaredType) {
          // Find underlying type to load default values into
          let actualType = next
          let nextType = next.type
          // TODO: Morph to support structs
          while (nextType[0] instanceof DeclaredType) {
            actualType = nextType[0]
            nextType = actualType.type
          }
          next = nextType[0]
        }
        let addr = next.bulkDefaultNodeCreator()(process.heap, length)
        let sizeof = 4
        if (next instanceof BoolType) sizeof = 1
        if (next instanceof StringType) sizeof = 2
        let arrayNodes = [] as ArrayNode[]
        if (T.element instanceof ArrayType) {
          let next2 = T.element
          while (next2.element instanceof ArrayType) {
            next2 = next2.element
          }
          let baseType = next2.element
          if (baseType instanceof BoolType) sizeof = 1
          if (baseType instanceof StringType) sizeof = 2
          let addr2 = addr
          // handle multi-dimensional arrays: inner-most layer
          // we ensured that the memory block is contiguous earlier
          // so we need to link ArrayNodes to the correct memory addresses
          for (let a = 0; a < length / next2.length; a++) {
            arrayNodes.push(ArrayNode.create(next2.length, process.heap, sizeof, addr2))
            addr2 += sizeof * next2.length
          }
          dimensions.pop()
          while (dimensions.length > 0) {
            let dim = dimensions.pop()
            let n = arrayNodes.length
            for (let a = 0; a < n / dim; a++) {
              let array = ArrayNode.create(dim, process.heap, sizeof, addr)
              for (let b = 0; b < dim; b++) {
                array.set_child(b, arrayNodes.shift().addr)
              }
              arrayNodes.push(array)
            }
          }
          new_frame.set_idx(arrayNodes.pop().addr, i)
        } else {
          // in the case of 1D array
          let array = ArrayNode.create(T.length, process.heap, sizeof, addr)
          new_frame.set_idx(array.addr, i)
        }
      } else if (T instanceof StructType) {
        let dimensions = [] as number[]
        let length = 0 //T.length
        let next = Object.values(T.fields)
        dimensions.push(length)
        for (let i = 0; i < next.length; i++) {
          if (next[i] instanceof DeclaredType) {
            // Find underlying type to load default values into
            let actualType = next[i]
            let nextType = next[i].type
            // TODO: Morph to support structs
            while (nextType[0] instanceof DeclaredType) {
              actualType = nextType[0]
              nextType = actualType.type
            }
            length += nextType[0].sizeof()
          } else {
            length += next[i].sizeof()
          }
        }
        let addr = T.bulkDefaultNodeCreator()(process.heap, length)
        /*
        let size = 0
        for (let i = 0; i < Object.values(T.fields).length; i++) {
          size += Object.values(T.fields)[i].sizeof()
        }
        let nextAddr = addr
        for (let i = 0; i < Object.values(T.fields).length; i++) {
          Object.values(T.fields)[i].defaultNodeAllocator()(process.heap, nextAddr)
          nextAddr += Object.values(T.fields)[i].sizeof()
        }
          */
        new_frame.set_idx(addr, i)
      } else {
        new_frame.set_idx(T.defaultNodeCreator()(process.heap), i)
      }
    }
    const new_env = process.context
      .E()
      .extend_env(new_frame.addr, this.for_block).addr
    process.context.pushRTS(new_env)
    let a = process.context.RTS().sz()
    process.heap.temp_pop()

    if (process.debug_mode) {
      process.debugger.env_alloc_map.set(new_env, process.runtime_count)
      process.debugger.env_name_map.set(new_env, this.name)
      const children = new_frame.get_children()
      for (let i = 0; i < children.length; i++) {
        process.debugger.identifier_map.set(children[i], this.identifiers[i])
        let c = process.context.RTS().sz()
        let d = 0
      }
    }
  }
}

export class FuncBlockInstruction extends BlockInstruction {
  constructor(public args: number) {
    super('ANONY FUNC', false)
    this.tag = 'FUNC_BLOCK'
  }

  override toString(): string {
    return this.tag
  }

  override execute(process: Process): void {
    let z = process.heap.get_value(process.context.OS().peek())
    super.execute(process)
    
    let x = process.heap.get_value(process.context.OS().peek())
    for (let i = this.args - 1; i >= 0; i--) {
      let z = process.heap.get_value(process.context.OS().peek())
      let x = process.heap.get_value(process.context.OS().peek())
      const src = process.context.popOS()
      const dst = process.context.E().get_frame().get_idx(i)
      let a = process.heap.get_value(src)
      let b = process.heap.get_value(dst)
      let y = process.context.RTS().sz()
      process.heap.copy(dst, src)
      let c = process.context.RTS().sz()
      let d = process.heap.get_value(dst)
      // deepcopy if struct or array
      let node = process.heap.get_value(src)
      if (node instanceof ArrayNode) {
        let dimensions = [] as number[]
        let length = node.length()
        let next = process.heap.get_value(node.get_child(0))
        let arrayStart = node.get_child(0)
        dimensions.push(length)
        while (next instanceof ArrayNode) {
          dimensions.push(next.length())
          length = length * next.length()
          arrayStart = next.get_child(0)
          next = process.heap.get_value(next.get_child(0))
        }
        if (next instanceof DeclaredType) {
          // Find underlying type to load default values into
          let actualType = next
          let nextType = next.type
          // TODO: Morph to support structs
          while (nextType[0] instanceof DeclaredType) {
            actualType = nextType[0]
            nextType = actualType.type
          }
          next = nextType[0]
        }
        let type = process.heap.get_type(next.addr)
        let addr = type.bulkDefaultNodeCreator()(process.heap, length)
        let sizeof = 4
        if (type instanceof BoolType) sizeof = 1
        if (type instanceof StringType) sizeof = 2
        // deepcopy each element
        for (let i = 0; i < length; i++) {
          process.heap.copy(addr + sizeof * i, arrayStart + sizeof * i)
        }
        let arrayNodes = [] as ArrayNode[]
        if (node instanceof ArrayNode) {
          let next2 = process.heap.get_value(node.get_child(0))
          let length2 = node.length()
          while (next2 instanceof ArrayNode) {
            length2 = next2.length()
            next2 = process.heap.get_value(next2.get_child(0))
          }
          let baseType = process.heap.get_type(next2.addr)
          if (baseType instanceof BoolType) sizeof = 1
          if (baseType instanceof StringType) sizeof = 2
          let addr2 = addr
          // handle multi-dimensional arrays: inner-most layer
          // we ensured that the memory block is contiguous earlier
          // so we need to link ArrayNodes to the correct memory addresses
          for (let a = 0; a < length / length2; a++) {
            arrayNodes.push(ArrayNode.create(length2, process.heap, sizeof, addr2))
            addr2 += sizeof * length2
          }
          dimensions.pop()
          while (dimensions.length > 0) {
            let dim = dimensions.pop()
            let n = arrayNodes.length
            for (let a = 0; a < n / dim; a++) {
              let array = ArrayNode.create(dim, process.heap, sizeof, addr)
              for (let b = 0; b < dim; b++) {
                array.set_child(b, arrayNodes.shift().addr)
              }
              arrayNodes.push(array)
            }
          }
          process.heap.copy(dst, arrayNodes.pop().addr)
        } else {
          // in the case of 1D array
          let array = ArrayNode.create(node.length(), process.heap, sizeof, addr)
          process.heap.copy(dst, array.addr)
        }
      }
    }
    // Pop function in stack
    const id = process.context.popOS()
    if (process.debug_mode) {
      const identifier = process.debugger.identifier_map.get(id)
      if (identifier) {
        process.debugger.env_name_map.set(process.context.E().addr, identifier)
      }
    }
  }
}

export class ExitBlockInstruction extends Instruction {
  constructor() {
    super('EXIT_BLOCK')
  }

  override execute(process: Process): void {
    process.context.popRTS()
  }
}
