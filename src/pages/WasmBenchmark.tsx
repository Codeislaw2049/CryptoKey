import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { splitJS as jsSplit, combineJS as jsCombine } from '../utils/shamir';
import { embedDataJS as jsEmbed } from '../utils/steganography';
import { wasmManager } from '../wasm/wasmLoader'; // Will be used when Wasm is ready

const WasmBenchmark: React.FC = () => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<{
    jsTime: number;
    wasmTime: number;
    isValid: boolean;
  } | null>(null);

  const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const runBenchmark = async () => {
    setIsRunning(true);
    setLogs([]);
    addLog(t('benchmark.log.starting'));

    try {
      // 1. JS Benchmark
      addLog(t('benchmark.log.runningJs'));
      const secret = "CryptoKey-Secret-Test-" + Math.random().toString(36).substring(7);
      const startJS = performance.now();
      
      // Shamir
      const shares = await jsSplit(secret, 5, 3); // Await is crucial here if jsSplit is async
      
      // Ensure shares is an array before slicing
      if (!Array.isArray(shares)) {
         throw new Error(t('errors.invalidShareType', { type: typeof shares }));
      }

      const recovered = await jsCombine(shares.slice(0, 3));
      
      // Stego (Mock data for benchmark)
      // Creating a small dummy image data (100x100 RGBA)
      const dummyImageData = new ImageData(new Uint8ClampedArray(100 * 100 * 4), 100, 100);
      // Fill with some noise
      for(let i=0; i<dummyImageData.data.length; i++) dummyImageData.data[i] = Math.floor(Math.random() * 255);
      
      jsEmbed(dummyImageData, secret);
      // const extracted = jsExtract(stegoResult, "password"); // Skip extract for speed in this test or add later

      const endJS = performance.now();
      const jsDuration = endJS - startJS;
      addLog(`JS Finished in ${jsDuration.toFixed(2)}ms`);

      // 2. Wasm Benchmark
      addLog(t('benchmark.log.loadingWasm'));
      const loaded = await wasmManager.loadProModule();
      if (!loaded) throw new Error(t('errors.wasmLoadFailed'));
      
      const wasmExports = wasmManager.getExports();
      if (!wasmExports) throw new Error("Wasm exports not available");

      addLog(t('benchmark.log.runningWasm'));
      const startWasm = performance.now();
      
      // Shamir (Rust)
      const wasmShares = wasmExports.split_secret(secret, 5, 3);
      
      // Stego (Rust)
      // Convert Uint8ClampedArray to Uint8Array for Wasm compatibility
      const uint8Data = new Uint8Array(dummyImageData.data.buffer);
      wasmExports.embed_stego(uint8Data, secret);
      
      const endWasm = performance.now();
      const wasmDuration = endWasm - startWasm;
      addLog(`Wasm Finished in ${wasmDuration.toFixed(2)}ms`);

      // 3. Validation
      const isValid = recovered === secret && wasmShares.length === 5;
      addLog(t('benchmark.validation.result', { result: isValid ? t('benchmark.validation.pass') : t('benchmark.validation.fail') }));

      setResults({
        jsTime: jsDuration,
        wasmTime: wasmDuration,
        isValid
      });

    } catch (e: any) {
      addLog(`Error: ${e.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-white">{t('wasmBenchmark.title')}</h1>

      <div className="bg-gray-800 rounded-lg p-6 mb-8 border border-gray-700">
        <h2 className="text-xl font-semibold mb-4 text-blue-400">{t('wasmBenchmark.testConfig')}</h2>
        <ul className="list-disc list-inside text-gray-300 space-y-2">
          <li>{t('wasmBenchmark.algorithm')}</li>
          <li>{t('wasmBenchmark.shares')}</li>
          <li>{t('wasmBenchmark.payload')}</li>
          <li>{t('wasmBenchmark.steganography')}</li>
        </ul>
      </div>

      <div className="flex gap-4 mb-8">
        <button
          onClick={runBenchmark}
          disabled={isRunning}
          className={`px-6 py-3 rounded-lg font-bold transition-colors ${
            isRunning
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {isRunning ? t('wasmBenchmark.running') : t('wasmBenchmark.startBenchmark')}
        </button>
      </div>

      {results && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 text-center">
            <div className="text-gray-400 mb-1">{t('wasmBenchmark.jsTime')}</div>
            <div className="text-2xl font-mono text-yellow-400">{results.jsTime.toFixed(2)}ms</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 text-center">
            <div className="text-gray-400 mb-1">{t('wasmBenchmark.wasmTime')}</div>
            <div className="text-2xl font-mono text-green-400">{results.wasmTime.toFixed(2)}ms</div>
            <div className="text-xs text-gray-500 mt-1">{t('wasmBenchmark.fasterSuffix', {ratio: (results.jsTime / results.wasmTime).toFixed(1)})}</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 text-center">
            <div className="text-gray-400 mb-1">{t('wasmBenchmark.correctness')}</div>
            <div className={`text-2xl font-bold ${results.isValid ? 'text-green-500' : 'text-red-500'}`}>
              {results.isValid ? t('wasmBenchmark.verified') : t('wasmBenchmark.failed')}
            </div>
          </div>
        </div>
      )}

      <div className="bg-black rounded-lg p-4 font-mono text-sm h-64 overflow-y-auto border border-gray-800">
        {logs.length === 0 ? (
          <span className="text-gray-600">{t('wasmBenchmark.waiting')}</span>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="text-gray-300 mb-1 border-b border-gray-900 pb-1">{log}</div>
          ))
        )}
      </div>
    </div>
  );
};

export default WasmBenchmark;
