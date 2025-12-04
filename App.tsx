import React, { useState } from 'react';
import { FileUploader } from './components/FileUploader';
import { processFiles, ProcessResult } from './utils/excelUtils';
import { ArrowRight, Download, RefreshCw, AlertCircle, FileSpreadsheet, Check, Users, UserMinus, RotateCcw } from 'lucide-react';

const App: React.FC = () => {
  const [baseFile, setBaseFile] = useState<File | null>(null);
  const [pensionistasFile, setPensionistasFile] = useState<File | null>(null);
  const [aposentadosFile, setAposentadosFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProcessResult | null>(null);

  const handleProcess = async () => {
    // Condition: Base file is mandatory, plus at least one of the others
    if (!baseFile || (!pensionistasFile && !aposentadosFile)) return;

    setIsProcessing(true);
    setResult(null);

    // Small timeout to allow UI to update to loading state
    setTimeout(async () => {
      const res = await processFiles(baseFile, pensionistasFile, aposentadosFile);
      setResult(res);
      setIsProcessing(false);
    }, 500);
  };

  const handleDownloadBlob = (blob: Blob | undefined, filename: string) => {
    if (blob) {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }
  };

  const handleReset = () => {
    setBaseFile(null);
    setPensionistasFile(null);
    setAposentadosFile(null);
    setResult(null);
  };

  const canAnalyze = baseFile && (pensionistasFile || aposentadosFile);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-3 bg-white rounded-2xl shadow-sm mb-4 border border-slate-100">
            <FileSpreadsheet className="text-blue-600 mr-2" size={28} />
            <span className="text-slate-800 font-bold text-xl tracking-tight">Análise Requerimentos Base COMPREV</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Cruzamento Base Comprev vs Base Pensionistas / Base Aposentados</h1>
          <p className="text-slate-500 max-w-lg mx-auto">
            Carregue a Base Geral e compare com Pensionistas (Matches) e/ou Aposentados (Ausentes).
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
          
          {/* File Inputs */}
          {!result && (
            <div className="p-8 space-y-8">
              <div className="grid md:grid-cols-3 gap-6 relative">
                
                {/* File 1 - Mandatory */}
                <div className="relative z-10">
                  <FileUploader 
                    label="1. Base Geral (Obrigatório)"
                    subLabel="Planilha com dados 'RGPS'"
                    file={baseFile}
                    onFileSelect={setBaseFile}
                  />
                </div>

                {/* File 2 - Optional */}
                <div className="relative z-10">
                  <FileUploader 
                    label="2. Pensionistas"
                    subLabel="Comparar (Encontrar na Base)"
                    file={pensionistasFile}
                    onFileSelect={setPensionistasFile}
                  />
                </div>

                {/* File 3 - Optional */}
                <div className="relative z-10">
                  <FileUploader 
                    label="3. Aposentados"
                    subLabel="Comparar (Faltantes na Base)"
                    file={aposentadosFile}
                    onFileSelect={setAposentadosFile}
                  />
                </div>

              </div>

              {/* Action Area */}
              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={handleProcess}
                  disabled={!canAnalyze || isProcessing}
                  className={`
                    flex items-center justify-center px-6 py-3 rounded-xl font-medium text-white transition-all shadow-lg
                    ${!canAnalyze || isProcessing 
                      ? 'bg-slate-300 cursor-not-allowed shadow-none' 
                      : 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-500/25 active:transform active:scale-95'}
                  `}
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="animate-spin mr-2" size={20} />
                      Processando...
                    </>
                  ) : (
                    <>
                      Iniciar Análise
                      <ArrowRight className="ml-2" size={20} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Result View */}
          {result && (
            <div className="p-8 bg-slate-50/50">
              
              {/* Status Header */}
              <div className={`rounded-xl p-6 ${result.success ? 'bg-white border-l-4 border-green-500 shadow-sm' : 'bg-red-50 border-l-4 border-red-500'} mb-8`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`shrink-0 p-2 rounded-full ${result.success ? 'bg-green-50 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {result.success ? <Check size={24} /> : <AlertCircle size={24} />}
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-bold text-slate-800">
                        {result.success ? 'Análise Finalizada' : 'Erro no Processamento'}
                      </h3>
                      <p className="text-sm text-slate-500">{result.message}</p>
                    </div>
                  </div>
                  
                  {result.stats && (
                    <div className="hidden sm:block text-right">
                       <p className="text-xs text-slate-400 uppercase font-semibold">Base Geral (Válida)</p>
                       <p className="text-2xl font-bold text-slate-700">{result.stats.baseFiltered.toLocaleString()}</p>
                       <p className="text-xs text-slate-400">Linhas (Excl. RGPS)</p>
                    </div>
                  )}
                </div>
              </div>

              {result.stats && (
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  
                  {/* Card Pensionistas - Only show if data exists */}
                  {result.stats.pensionistasTotal !== undefined && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-5">
                        <Users size={80} />
                      </div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <div className="bg-blue-100 text-blue-700 p-2 rounded-lg mr-3">
                            <Users size={20} />
                          </div>
                          <h3 className="text-lg font-bold text-slate-800">Pensionistas</h3>
                        </div>
                      </div>
                      <p className="text-sm text-slate-500 mb-6 h-10">
                        CPFs de pensionistas encontrados na Base Geral.
                      </p>
                      
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-slate-50 p-3 rounded-lg flex flex-col justify-center">
                          <p className="text-xs text-slate-400 uppercase">Arquivo</p>
                          <p className="text-lg font-semibold text-slate-700">{result.stats.pensionistasTotal}</p>
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg border border-green-100 flex flex-col justify-between">
                          <div>
                            <p className="text-xs text-green-600 uppercase font-bold">Matches</p>
                            <p className="text-xl font-bold text-green-700">{result.stats.pensionistasMatches}</p>
                          </div>
                          <p className="text-[10px] leading-tight text-green-600 mt-2 font-medium">precisa ser enviado o requerimento</p>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => handleDownloadBlob(result.pensionistasBlob, `Resultado_Pensionistas_${new Date().toISOString().slice(0,10)}.xlsx`)}
                        className="mt-auto w-full flex items-center justify-center px-4 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium transition-colors border border-blue-200"
                      >
                        <Download size={18} className="mr-2" />
                        Baixar Matches
                      </button>
                    </div>
                  )}

                  {/* Card Aposentados - Only show if data exists */}
                  {result.stats.aposentadosTotal !== undefined && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col relative overflow-hidden">
                       <div className="absolute top-0 right-0 p-4 opacity-5">
                        <UserMinus size={80} />
                      </div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <div className="bg-orange-100 text-orange-700 p-2 rounded-lg mr-3">
                            <UserMinus size={20} />
                          </div>
                          <h3 className="text-lg font-bold text-slate-800">Aposentados</h3>
                        </div>
                      </div>
                      <p className="text-sm text-slate-500 mb-6 h-10">
                         CPFs de aposentados que <strong>não</strong> estão na Base Geral.
                      </p>
                      
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-slate-50 p-3 rounded-lg flex flex-col justify-center">
                          <p className="text-xs text-slate-400 uppercase">Arquivo</p>
                          <p className="text-lg font-semibold text-slate-700">{result.stats.aposentadosTotal}</p>
                        </div>
                        <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 flex flex-col justify-between">
                          <div>
                            <p className="text-xs text-orange-600 uppercase font-bold">Ausentes</p>
                            <p className="text-xl font-bold text-orange-700">{result.stats.aposentadosMissing}</p>
                          </div>
                          <p className="text-[10px] leading-tight text-orange-600 mt-2 font-medium">não foi enviado o requerimento</p>
                        </div>
                      </div>

                      <button 
                        onClick={() => handleDownloadBlob(result.aposentadosBlob, `Resultado_Aposentados_Ausentes_${new Date().toISOString().slice(0,10)}.xlsx`)}
                        className="mt-auto w-full flex items-center justify-center px-4 py-2 rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 font-medium transition-colors border border-orange-200"
                      >
                        <Download size={18} className="mr-2" />
                        Baixar Ausentes
                      </button>
                    </div>
                  )}

                </div>
              )}

              <div className="flex gap-4 justify-end border-t border-slate-200 pt-6">
                <button
                  onClick={handleReset}
                  className="flex items-center px-6 py-3 rounded-xl font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm"
                >
                  <RotateCcw className="mr-2" size={18} />
                  Nova Análise
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;