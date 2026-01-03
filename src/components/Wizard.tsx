import { useState } from 'react';
import { ModeSelection } from './steps/ModeSelection';
import { InputStep } from './steps/InputStep';
import { MixStep } from './steps/MixStep';
import { ResultStep } from './steps/ResultStep';

type Step = 'mode' | 'input' | 'mix' | 'result';

interface WizardProps {
  initialSecret?: string;
  initialMode?: 'general' | 'mnemonic' | 'file' | 'url';
  initialIntent?: 'crypto' | 'password';
  onNavigateToStego?: (secret: string) => void;
}

export const Wizard = ({ initialSecret, initialMode, initialIntent, onNavigateToStego: _onNavigateToStego }: WizardProps) => {
  const [step, setStep] = useState<Step>(initialSecret || initialMode ? 'input' : 'mode');
  const [mode, setMode] = useState<'general' | 'mnemonic' | 'file' | 'url'>(initialMode || (initialSecret ? 'mnemonic' : 'general'));
  const [intent, setIntent] = useState<'crypto' | 'password'>(initialIntent || 'crypto');
  const [realData, setRealData] = useState<string[]>([]);
  const [originalInput, setOriginalInput] = useState<string>(initialSecret || '');
  const [result, setResult] = useState<{ ciphertext: string; hash: string; realRowIndex: number; password?: string } | null>(null);

  const handleModeSelect = (selectedMode: 'general' | 'mnemonic' | 'file' | 'url', selectedIntent?: 'crypto' | 'password') => {
    setMode(selectedMode);
    if (selectedIntent) {
      setIntent(selectedIntent);
    }
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
    <div className="w-full max-w-5xl mx-auto">
      {step === 'mode' && <ModeSelection onSelect={handleModeSelect} />}
      {step === 'input' && (
        <InputStep 
          mode={mode}
          intent={intent}
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
          intent={intent}
          onReset={handleReset} 
        />
      )}
    </div>
  );
};
