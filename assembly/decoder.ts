import { DataReader } from "./datareader";
import { Format } from "./format";
import { Result } from "./result";
import { E_INVALIDLENGTH } from "util/error";


export class Decoder {
  private readonly decoder: SafeDecoder;

  constructor(ua: ArrayBuffer) {
    this.decoder = new SafeDecoder(ua);
  }

  isNextNil(): bool {
    return this.decoder.isNextNil();
  }

  readBool(): bool {
    return this.decoder.readBool().unwrap();
  }

  readInt8(): i8 {
    return this.decoder.readInt8().unwrap();
  }

  readInt16(): i16 {
    return this.decoder.readInt16().unwrap();
  }

  readInt32(): i32 {
    return this.decoder.readInt32().unwrap();
  }

  readInt64(): i64 {
    return this.decoder.readInt64().unwrap();
  }

  readUInt8(): u8 {
    return this.decoder.readUInt8().unwrap();
  }

  readUInt16(): u16 {
    return this.decoder.readUInt16().unwrap();
  }

  readUInt32(): u32 {
    return this.decoder.readUInt32().unwrap();
  }

  readUInt64(): u64 {
    return this.decoder.readUInt64().unwrap();
  }

  readFloat32(): f32 {
    return this.decoder.readFloat32().unwrap();
  }

  readFloat64(): f64 {
    return this.decoder.readFloat64().unwrap();
  }

  readString(): string {
    return this.decoder.readString().unwrap();
  }

  readStringLength(): u32 {
    return this.decoder.readStringLength();
  }

  readBinLength(): u32 {
    return this.decoder.readBinLength();
  }

  readByteArray(): ArrayBuffer {
    return this.decoder.readByteArray().unwrap();
  }

  readArraySize(): u32 {
    return this.decoder.readArraySize();
  }

  readMapSize(): u32 {
    return this.decoder.readMapSize().unwrap();
  }

  readArray<T>(fn: (decoder: SafeDecoder) => T): Array<T> {
    return this.decoder.readArray(fn).unwrap();
  }

  readNullableArray<T>(fn: (decoder: SafeDecoder) => T): Array<T> | null {
    return this.decoder.readNullableArray(fn);
  }

  readMap<K, V>(keyFn: (decoder: SafeDecoder) => K, valueFn: (decoder: SafeDecoder) => V): Map<K, V> {
    return this.decoder.readMap(keyFn, valueFn).unwrap();
  }

  readNullableMap<K, V>(keyFn: (decoder: SafeDecoder) => K, valueFn: (decoder: SafeDecoder) => V): Map<K, V> | null {
    return this.decoder.readNullableMap(keyFn, valueFn);
  }

  skip(): void {
    this.decoder.skip();
  }
}

export class SafeDecoder {
  private reader: DataReader;

  constructor(ua: ArrayBuffer) {
    this.reader = new DataReader(ua, 0, ua.byteLength);
  }

  isNextNil(): bool {
    if (this.reader.peekUint8() == Format.NIL) {
      this.reader.discard(1);
      return true;
    }
    return false;
  }

  readBool(): Result<bool, Error> {
    const value = this.reader.getUint8();
    if (value == Format.TRUE) {
      return Result.ok<bool, Error>(true);
    } else if (value == Format.FALSE) {
      return Result.ok<bool, Error>(false);
    }
    return Result.err<bool, Error>(new Error("bad value for bool"));
  }

  readInt8(): Result<i8, Error> {
    const value = this.readInt64().unwrap();
    if (value <= <i64>i8.MAX_VALUE && value >= <i64>i8.MIN_VALUE) {
      return Result.ok<i8, Error>(<i8>value);
    }
    return Result.err<i8, Error>(new Error(
      "interger overflow: value = " + value.toString() + "; bits = 8"
    ));
  }

  readInt16(): Result<i16, Error> {
    const value = this.readInt64().unwrap();
    if (value <= <i64>i16.MAX_VALUE && value >= <i64>i16.MIN_VALUE) {
      return Result.ok<i16, Error>(<i16>value);
    }
    return Result.err<i16, Error>(new Error(
      "interger overflow: value = " + value.toString() + "; bits = 16"
    ));
  }

  readInt32(): Result<i32, Error> {
    const value = this.readInt64().unwrap();
    if (value <= <i64>i32.MAX_VALUE && value >= <i64>i32.MIN_VALUE) {
      return Result.ok<i32, Error>(<i32>value);
    }
    return Result.err<i32, Error>(new Error(
      "interger overflow: value = " + value.toString() + "; bits = 32"
    ));
  }

  readInt64(): Result<i64, Error> {
    const prefix = this.reader.getUint8();

    if (this.isFixedInt(prefix)) {
      return Result.ok<i64, Error>(<i64>prefix);
    }
    if (this.isNegativeFixedInt(prefix)) {
      return Result.ok<i64, Error>(<i64>(<i8>prefix));
    }
    switch (prefix) {
      case Format.INT8:
        return Result.ok<i64, Error>(<i64>this.reader.getInt8());
      case Format.INT16:
        return Result.ok<i64, Error>(<i64>this.reader.getInt16());
      case Format.INT32:
        return Result.ok<i64, Error>(<i64>this.reader.getInt32());
      case Format.INT64:
        return Result.ok<i64, Error>(this.reader.getInt64());
      case Format.UINT8:
        return Result.ok<i64, Error>(<i64>this.reader.getUint8());
      case Format.UINT16:
        return Result.ok<i64, Error>(<i64>this.reader.getUint16());
      case Format.UINT32:
        return Result.ok<i64, Error>(<i64>this.reader.getUint32());
      case Format.UINT64: {
        const value = this.reader.getUint64();
        if (value <= <u64>i64.MAX_VALUE) {
          return Result.ok<i64, Error>(<i64>value);
        }

        return Result.err<i64, Error>(new Error(
          "interger overflow: value = " + value.toString() + "; type = i64"
        ));
      }
      default:
        return Result.err<i64, Error>(new Error("bad prefix for int"));
    }
  }

  readUInt8(): Result<u8, Error> {
    const value = this.readUInt64().unwrap();
    if (value <= <u64>u8.MAX_VALUE) {
      return Result.ok<u8, Error>(<u8>value);
    }
    return Result.err<u8, Error>(new Error(
      "unsigned interger overflow: value = " + value.toString() + "; bits = 8"
    ));
  }

  readUInt16(): Result<u16, Error> {
    const value = this.readUInt64().unwrap();
    if (value <= <u64>u16.MAX_VALUE) {
      return Result.ok<u16, Error>(<u16>value);
    }
    return Result.err<u16, Error>(new Error(
      "unsigned interger overflow: value = " + value.toString() + "; bits = 16"
    ));
  }

  readUInt32(): Result<u32, Error> {
    const value = this.readUInt64().unwrap();
    if (value <= <u64>u32.MAX_VALUE) {
      return Result.ok<u32, Error>(<u32>value);
    }
    return Result.err<u32, Error>(new Error(
      "unsigned interger overflow: value = " + value.toString() + "; bits = 32"
    ));
  }

  readUInt64(): Result<u64, Error> {
    const prefix = this.reader.getUint8();

    if (this.isFixedInt(prefix)) {
      return Result.ok<u64, Error>(<u64>prefix);
    } else if (this.isNegativeFixedInt(prefix)) {
      return Result.err<u64, Error>(new Error("bad prefix"));
    }

    switch (prefix) {
      case Format.UINT8:
        return Result.ok<u64, Error>(<u64>this.reader.getUint8());
      case Format.UINT16:
        return Result.ok<u64, Error>(<u64>this.reader.getUint16());
      case Format.UINT32:
        return Result.ok<u64, Error>(<u64>this.reader.getUint32());
      case Format.UINT64:
        return Result.ok<u64, Error>(this.reader.getUint64());
      case Format.INT8: {
        const value = this.reader.getInt8();
        if (value >= 0) {
          return Result.ok<u64, Error>(<u64>value);
        }
        return Result.err<u64, Error>(new Error(
          "interger underflow: value = " + value.toString() + "; type = u64"
        ));
      }
      case Format.INT16:
        const value = this.reader.getInt16();
        if (value >= 0) {
          return Result.ok<u64, Error>(<u64>value);
        }
        return Result.err<u64, Error>(new Error(
          "interger underflow: value = " + value.toString() + "; type = u64"
        ));
      case Format.INT32:
        const value = this.reader.getInt32();
        if (value >= 0) {
          return Result.ok<u64, Error>(<u64>value);
        }
        return Result.err<u64, Error>(new Error(
          "interger underflow: value = " + value.toString() + "; type = u64"
        ));
      case Format.INT64:
        const value = this.reader.getInt64();
        if (value >= 0) {
          return Result.ok<u64, Error>(<u64>value);
        }
        return Result.err<u64, Error>(new Error(
          "interger underflow: value = " + value.toString() + "; type = u64"
        ));
      default:
        return Result.err<u64, Error>(new Error("bad prefix for int"));
    }
  }

  readFloat32(): Result<f32, Error> {
    const prefix = this.reader.getUint8();
    if (this.isFloat32(prefix)) {
      return Result.ok<f32, Error>(<f32>this.reader.getFloat32());
    } else if (this.isFloat64(prefix)) {
      const value = this.reader.getFloat64();
      const diff = <f64>f32.MAX_VALUE - value;

      if (abs(diff) <= <f64>f32.EPSILON) {
        return Result.ok<f32, Error>(f32.MAX_VALUE);
      } else if (diff < 0) {
        return Result.err<f32, Error>(new Error(
          "float overflow: value = " + value.toString() + "; type = f32"
        ));
      } else {
        return Result.ok<f32, Error>(<f32>value);
      }
    } else {
      return Result.err<f32, Error>(new Error("bad prefix for float"));
    }
  }

  readFloat64(): Result<f64, Error> {
    const prefix = this.reader.getUint8();
    if (this.isFloat64(prefix)) {
      return Result.ok<f64, Error>(<f64>this.reader.getFloat64());
    } else if (this.isFloat32(prefix)) {
      return Result.ok<f64, Error>(<f64>this.reader.getFloat32());
    } else {
      return Result.err<f64, Error>(new Error("bad prefix for float"));
    }
  }

  readString(): Result<string, Error> {
    const result = this.readStringLength();
    if (result.isErr) {
      return Result.err<string, Error>(result.unwrap_err());
    }

    const strLen = result.unwrap();
    const stringBytes = this.reader.getBytes(strLen);
    return Result.ok<string, Error>(String.UTF8.decode(stringBytes));
  }

  readStringLength(): Result<u32, Error> {
    const leadByte = this.reader.getUint8();
    if (this.isFixedString(leadByte)) {
      return Result.ok<u32, Error>(leadByte & 0x1f);
    }
    if (this.isFixedArray(leadByte)) {
      return Result.ok<u32, Error>(<u32>(leadByte & Format.FOUR_LEAST_SIG_BITS_IN_BYTE));
    }
    switch (leadByte) {
      case Format.STR8:
        return Result.ok<u32, Error>(<u32>this.reader.getUint8());
      case Format.STR16:
        return Result.ok<u32, Error>(<u32>this.reader.getUint16());
      case Format.STR32:
        return Result.ok<u32, Error>(this.reader.getUint32());
    }

    return Result.err<u32, Error>(new RangeError(E_INVALIDLENGTH + leadByte.toString()));
  }

  readBinLength(): Result<u32, Error> {
    if (this.isNextNil()) {
      return Result.ok<u32, Error>(0);
    }
    const leadByte = this.reader.getUint8();
    if (this.isFixedArray(leadByte)) {
      return Result.ok<u32, Error>(<u32>(leadByte & Format.FOUR_LEAST_SIG_BITS_IN_BYTE));
    }
    switch (leadByte) {
      case Format.BIN8:
        return Result.ok<u32, Error>(<u32>this.reader.getUint8());
      case Format.BIN16:
        return Result.ok<u32, Error>(<u32>this.reader.getUint16());
      case Format.BIN32:
        return Result.ok<u32, Error>(this.reader.getUint32());
    }
    return Result.err<u32, Error>(new RangeError(E_INVALIDLENGTH));
  }

  readByteArray(): Result<ArrayBuffer, Error> {
    const result = this.readBinLength();
    if (result.isErr) {
      return Result.err<ArrayBuffer, Error>(result.unwrap_err());
    }

    const arrLength = result.unwrap();
    const arrBytes = this.reader.getBytes(arrLength);
    return Result.ok<ArrayBuffer, Error>(arrBytes);
  }

  readArraySize(): Result<u32, Error> {
    const leadByte = this.reader.getUint8();
    if (this.isFixedArray(leadByte)) {
      return Result.ok<u32, Error>(<u32>(leadByte & Format.FOUR_LEAST_SIG_BITS_IN_BYTE));
    } else if (leadByte == Format.ARRAY16) {
      return Result.ok<u32, Error>(<u32>this.reader.getUint16());
    } else if (leadByte == Format.ARRAY32) {
      return Result.ok<u32, Error>(this.reader.getUint32());
    } else if (leadByte == Format.NIL) {
      return Result.ok<u32, Error>(0);
    }
    return Result.err<u32, Error>(new RangeError(E_INVALIDLENGTH + leadByte.toString()));
  }

  readMapSize(): Result<u32, Error> {
    const leadByte = this.reader.getUint8();
    if (this.isFixedMap(leadByte)) {
      return Result.ok<u32, Error>(<u32>(leadByte & Format.FOUR_LEAST_SIG_BITS_IN_BYTE));
    } else if (leadByte == Format.MAP16) {
      return Result.ok<u32, Error>(<u32>this.reader.getUint16());
    } else if (leadByte == Format.MAP32) {
      return Result.ok<u32, Error>(this.reader.getUint32());
    }
    return Result.err<u32, Error>(new RangeError(E_INVALIDLENGTH));
  }

  private isFloat32(u: u8): bool {
    return u == Format.FLOAT32;
  }

  private isFloat64(u: u8): bool {
    return u == Format.FLOAT64;
  }

  private isFixedInt(u: u8): bool {
    return u >> 7 == 0;
  }

  private isNegativeFixedInt(u: u8): bool {
    return (u & 0xe0) == Format.NEGATIVE_FIXINT;
  }

  private isFixedMap(u: u8): bool {
    return (u & 0xf0) == Format.FIXMAP;
  }

  private isFixedArray(u: u8): bool {
    return (u & 0xf0) == Format.FIXARRAY;
  }

  private isFixedString(u: u8): bool {
    return (u & 0xe0) == Format.FIXSTR;
  }

  private isNil(u: u8): bool {
    return u == Format.NIL;
  }

  skip(): void {
    // getSize handles discarding 'msgpack header' info
    let numberOfObjectsToDiscard = this.getSize();

    while (numberOfObjectsToDiscard > 0) {
      this.skip(); // discard next object
      numberOfObjectsToDiscard--;
    }
  }

  private getSize(): i32 {
    const leadByte = this.reader.getUint8(); // will discard one
    let objectsToDiscard = <i32>0;
    // Handled for fixed values
    if (this.isNegativeFixedInt(leadByte)) {
      // noop, will just discard the leadbyte
    } else if (this.isFixedInt(leadByte)) {
      // noop, will just discard the leadbyte
    } else if (this.isFixedString(leadByte)) {
      let strLength = leadByte & 0x1f;
      this.reader.discard(strLength);
    } else if (this.isFixedArray(leadByte)) {
      // TODO handle overflow
      objectsToDiscard = <i32>(leadByte & Format.FOUR_LEAST_SIG_BITS_IN_BYTE);
    } else if (this.isFixedMap(leadByte)) {
      // TODO handle overflow
      objectsToDiscard =
        2 * <i32>(leadByte & Format.FOUR_LEAST_SIG_BITS_IN_BYTE);
    } else {
      switch (leadByte) {
        case Format.NIL:
          break;
        case Format.TRUE:
          break;
        case Format.FALSE:
          break;
        case Format.BIN8:
          this.reader.discard(<i32>this.reader.getUint8());
          break;
        case Format.BIN16:
          this.reader.discard(<i32>this.reader.getUint16());
          break;
        case Format.BIN32:
          this.reader.discard(<i32>this.reader.getUint32());
          break;
        case Format.FLOAT32:
          this.reader.discard(4);
          break;
        case Format.FLOAT64:
          this.reader.discard(8);
          break;
        case Format.UINT8:
          this.reader.discard(1);
          break;
        case Format.UINT16:
          this.reader.discard(2);
          break;
        case Format.UINT32:
          this.reader.discard(4);
          break;
        case Format.UINT64:
          this.reader.discard(8);
          break;
        case Format.INT8:
          this.reader.discard(1);
          break;
        case Format.INT16:
          this.reader.discard(2);
          break;
        case Format.INT32:
          this.reader.discard(4);
          break;
        case Format.INT64:
          this.reader.discard(8);
          break;
        case Format.FIXEXT1:
          this.reader.discard(2);
          break;
        case Format.FIXEXT2:
          this.reader.discard(3);
          break;
        case Format.FIXEXT4:
          this.reader.discard(5);
          break;
        case Format.FIXEXT8:
          this.reader.discard(9);
          break;
        case Format.FIXEXT16:
          this.reader.discard(17);
          break;
        case Format.STR8:
          this.reader.discard(this.reader.getUint8());
          break;
        case Format.STR16:
          this.reader.discard(this.reader.getUint16());
          break;
        case Format.STR32:
          // TODO overflow, need to modify discard and underlying array buffer
          this.reader.discard(this.reader.getUint32());
          break;
        case Format.ARRAY16:
          //TODO OVERFLOW
          objectsToDiscard = <i32>this.reader.getUint16();
          break;
        case Format.ARRAY32:
          //TODO OVERFLOW
          objectsToDiscard = <i32>this.reader.getUint32();
          break;
        case Format.MAP16:
          //TODO OVERFLOW
          objectsToDiscard = 2 * <i32>this.reader.getUint16();
          break;
        case Format.MAP32:
          //TODO OVERFLOW
          objectsToDiscard = 2 * <i32>this.reader.getUint32();
          break;
        default:
          throw new TypeError(
            "invalid prefix, bad encoding for val: " + leadByte.toString()
          );
      }
    }

    return objectsToDiscard;
  }

  readArray<T>(fn: (decoder: SafeDecoder) => T): Result<Array<T>, Error> {
    const result = this.readArraySize();
    if (result.isErr) {
      return Result.err<Array<T>, Error>(result.unwrap_err());
    }

    const size = result.unwrap();
    let a = new Array<T>();
    for (let i: u32 = 0; i < size; i++) {
      const item = fn(this);
      a.push(item);
    }
    return Result.ok<Array<T>, Error>(a);
  }

  readNullableArray<T>(fn: (decoder: SafeDecoder) => T): Array<T> | null {
    if (this.isNextNil()) {
      return null;
    }
    return this.readArray(fn).unwrap();
  }

  readMap<K, V>(
    keyFn: (decoder: SafeDecoder) => K,
    valueFn: (decoder: SafeDecoder) => V
  ): Result<Map<K, V>, Error> {
    const result = this.readMapSize();
    if (result.isErr) {
      return Result.err<Map<K, V>, Error>(result.unwrap_err());
    }

    const size = result.unwrap();
    let m = new Map<K, V>();
    for (let i: u32 = 0; i < size; i++) {
      const key = keyFn(this);
      const value = valueFn(this);
      m.set(key, value);
    }
    return Result.ok<Map<K, V>, Error>(m);
  }

  readNullableMap<K, V>(
    keyFn: (decoder: SafeDecoder) => K,
    valueFn: (decoder: SafeDecoder) => V
  ): Map<K, V> | null {
    if (this.isNextNil()) {
      return null;
    }
    return this.readMap(keyFn, valueFn).unwrap();
  }
}
