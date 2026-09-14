import {
  instantiateNapiModuleSync,
  MessageHandler,
  WASI,
  emnapiAsyncWorkPlugin,
  emnapiTSFNPlugin,
} from '@napi-rs/wasm-runtime'

const errorOutputs = []

const handler = new MessageHandler({
  onLoad({ wasmModule, wasmMemory }) {
    const wasi = new WASI({
      print: function () {
        // eslint-disable-next-line no-console
        console.log.apply(console, arguments)
      },
      printErr: function () {
        // eslint-disable-next-line no-console
        console.error.apply(console, arguments)
        errorOutputs.push([...arguments])
      },
    })
    return instantiateNapiModuleSync(wasmModule, {
      childThread: true,
      wasi,
      // The wasm links a "basic" emnapi archive (no C async-work /
      // threadsafe-function implementations), so every thread that
      // instantiates it must provide the JavaScript implementations
      // through the emnapi plugins.
      plugins: [emnapiAsyncWorkPlugin, emnapiTSFNPlugin],
      overwriteImports(importObject) {
        importObject.env = {
          ...importObject.env,
          ...importObject.napi,
          ...importObject.emnapi,
          memory: wasmMemory,
        }
      },
    })
  },
  onError(error) {
    postMessage({ type: 'error', error, errorOutputs })
    errorOutputs.length = 0
  }
})

globalThis.onmessage = function (e) {
  handler.handle(e)
}
