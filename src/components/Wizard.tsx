import { useState } from 'react';
import { ModeSelection } from './steps/ModeSelection';
import { InputStep } from './steps/InputStep';
import { MixStep } from './steps/MixStep';
import { ResultStep } from './steps/ResultStep';

type Step = 'mode' | 'input' | 'mix' | 'result';

interface WizardProps {
  initialSecret?: string;
  onNavigateToStego?: (secret: string) => void;
}

export const Wizard = ({ initialSecret, onNavigateToStego: _onNavigateToStego }: WizardProps) => {
  const [step, setStep] = useState<Step>(initialSecret ? 'input' : 'mode');
  const [mode, setMode] = useState<'general' | 'mnemonic' | 'file' | 'url'>(initialSecret ? 'mnemonic' : 'general');
  const [realData, setRealData] = useState<string[]>([]);
  const [originalInput, setOriginalInput] = useState<string>(initialSecret || '');
  const [result, setResult] = useState<{ ciphertext: string; hash: string; realRowIndex: number; password?: string } | null>(null);

  const handleModeSelect = (selectedMode: 'general' | 'mnemonic' | 'file' | 'url') => {
    setMode(selectedMode);
    setStep('input');
  };

  const handleInputSubmit = (data: string[], originalMnemonic?: string) => {
    setRealData(data);
    if (originalMnemonic) {
      setOriginalInput(originalMnemonic);
    } else {
      setOriginalInput('');
    }
    setStep('mix');
  };

  const handleMixSubmit = (res: { ciphertext: string; hash: string; realRowIndex: number; password: string }) => {
    setResult(res);
    setStep('result');
  };

  const handleReset = () => {
    setStep('mode');
    setRealData([]);
    setOriginalInput('');
    setResult(null);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {step === 'mode' && <ModeSelection onSelect={handleModeSelect} />}
      {step === 'input' && (
        <InputStep 
          mode={mode} 
          initialValue={originalInput}
          onNext={handleInputSubmit} 
          onBack={() => setStep('mode')} 
        />
      )}
      {step === 'mix' && (
        <MixStep 
          realData={realData} 
          onNext={handleMixSubmit} 
          onBack={() => setStep('input')} 
        />
      )}
      {step === 'result' && result && (
        <ResultStep 
          result={result} 
          mnemonic={originalInput}
          onReset={handleReset} 
        />
      )}
    </div>
  );
};
