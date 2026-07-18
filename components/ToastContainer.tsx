'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useToast } from '@/lib/toast-context';

const ICON: Record<string, React.ReactNode> = {
  success: <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0" />,
  error:   <XCircleIcon     className="w-5 h-5 text-red-500   flex-shrink-0" />,
  info:    <InformationCircleIcon className="w-5 h-5 text-blue-500 flex-shrink-0" />,
};

const BORDER: Record<string, string> = {
  success: 'border-l-green-500',
  error:   'border-l-red-500',
  info:    'border-l-blue-500',
};

export default function ToastContainer() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed bottom-24 md:bottom-6 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 60, scale: 0.95 }}
            animate={{ opacity: 1, x: 0,  scale: 1 }}
            exit={{    opacity: 0, x: 60, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`pointer-events-auto flex items-center gap-3 bg-white rounded-xl shadow-lg border border-gray-100 border-l-4 ${BORDER[t.type]} px-4 py-3 min-w-[240px] max-w-[320px]`}
          >
            {ICON[t.type]}
            <span className="text-sm text-gray-800 flex-1">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              className="text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
