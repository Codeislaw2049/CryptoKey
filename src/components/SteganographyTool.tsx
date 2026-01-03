import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Image as ImageIcon, FileText, Video, ArrowLeft, Layers } from 'lucide-react';
import { ImageStego } from './stego/ImageStego';
import { FileVault } from './stego/FileVault';
import { ImageVault } from './stego/ImageVault';
import { VideoVault } from './stego/VideoVault';

interface SteganographyToolProps {
  initialSecret?: string;
  onExtract?: (secret: string) => void;
}

type StegoMode = 'image' | 'file' | 'image-vault' | 'video';

export function SteganographyTool({ initialSecret, onExtract }: SteganographyToolProps) {
  const { t } = useTranslation();
  const [activeMode, setActiveMode] = useState<StegoMode | null>(null);

  useEffect(() => {
    if (initialSecret) {
      setActiveMode('image');
    }
  }, [initialSecret]);

  const cards = [
    {
      id: 'image' as StegoMode,
      title: t('steganography.card.image.title') || 'Image Steganography',
      description: t('steganography.card.image.desc') || 'Hide text messages inside images using LSB steganography.',
      icon: ImageIcon,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10',
      borderColor: 'border-indigo-500/20'
    },
    {
      id: 'file' as StegoMode,
      title: t('steganography.card.file.title') || 'File Vault',
      description: t('steganography.card.file.desc') || 'Securely merge and shard multiple files into encrypted fragments.',
      icon: FileText,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20'
    },
    {
      id: 'image-vault' as StegoMode,
      title: t('steganography.card.imageVault.title') || 'Image Vault',
      description: t('steganography.card.imageVault.desc') || 'Hide any file within an image carrier.',
      icon: Layers,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20'
    },
    {
      id: 'video' as StegoMode,
      title: t('steganography.card.video.title') || 'Video Vault',
      description: t('steganography.card.video.desc') || 'Conceal information within video streams.',
      icon: Video,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/20'
    }
  ];

  const renderActiveComponent = () => {
    switch (activeMode) {
      case 'image':
        return <ImageStego initialSecret={initialSecret} onExtract={onExtract} />;
      case 'file':
        return <FileVault />;
      case 'image-vault':
        return <ImageVault />;
      case 'video':
        return <VideoVault />;
      default:
        return null;
    }
  };

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {!activeMode ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {cards.map((card) => (
              <button
                key={card.id}
                onClick={() => setActiveMode(card.id)}
                className={`group relative overflow-hidden rounded-2xl ${card.bgColor} border ${card.borderColor} p-6 text-left transition-all hover:scale-[1.02] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-indigo-500`}
              >
                <div className={`mb-4 p-3 rounded-xl bg-slate-900/50 w-fit ${card.color} group-hover:scale-110 transition-transform duration-300`}>
                  <card.icon size={32} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{card.title}</h3>
                <p className="text-slate-400 text-sm">{card.description}</p>
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                   <ArrowLeft className="rotate-180 text-white/50" size={20} />
                </div>
              </button>
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="w-full"
          >
            <div className="mb-6 flex items-center gap-4">
              <button
                onClick={() => setActiveMode(null)}
                className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft size={24} />
              </button>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {cards.find(c => c.id === activeMode)?.icon && (() => {
                    const Icon = cards.find(c => c.id === activeMode)!.icon;
                    return <Icon size={24} className={cards.find(c => c.id === activeMode)?.color} />;
                })()}
                {cards.find(c => c.id === activeMode)?.title}
              </h2>
            </div>
            
            <div className="bg-slate-900/50 rounded-2xl p-1">
               {renderActiveComponent()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
