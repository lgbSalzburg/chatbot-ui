import { motion } from 'framer-motion';
import { MessageCircle, BotIcon } from 'lucide-react';

export const Overview = () => {
  const isPort8501 = typeof window !== "undefined" && window.location.port === "8501";

  return (
    <>
    <motion.div
      key="overview"
      className="max-w-3xl mx-auto md:mt-20"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: 0.75 }}
    >
      <div className="rounded-xl p-6 flex flex-col gap-8 leading-relaxed text-center max-w-xl">
        <p className="flex flex-row justify-center gap-4 items-center">
          <BotIcon size={44}/>
          <span>+</span>
          <MessageCircle size={44}/>
        </p>
        <p>
          Willkommen beim Chatbot für Fragen zum <strong>Heizkostenzuschuss</strong><br />
          {isPort8501 ? (
            <>Dieser Chatbot ist LLM basiert<br /></>
          ) : (
            <>
              Dieser Chatbot basiert auf Regeln<br />
            </>
          )}
          {/* <strong>Leon Binder</strong> and <strong>Christoph Handschuh</strong>. */}
        </p>
      </div>
    </motion.div>
    </>
  );
};
