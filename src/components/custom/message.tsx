import { motion } from 'framer-motion';
import { cx } from 'classix';
import { SparklesIcon } from './icons';
import { Markdown } from './markdown';
import { message } from "../../interfaces/interfaces"
import { MessageActions } from '@/components/custom/actions';

export const PreviewMessage = ({ message }: { message: message; }) => {

  return (
    <motion.div
      className="w-full mx-auto max-w-3xl px-4 group/message"
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      data-role={message.role}
    >
      <div
        className={cx(
          'flex gap-4 w-full max-w-2xl py-3 px-4 rounded-xl border border-border bg-background/90',
          'group-data-[role=user]/message:w-fit group-data-[role=user]/message:ml-auto',
          'group-data-[role=user]/message:bg-zinc-700 dark:group-data-[role=user]/message:bg-muted group-data-[role=user]/message:text-white'
        )}
      >
        {message.role === 'assistant' && (
          <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border">
            <SparklesIcon size={14} />
          </div>
        )}

        <div className="flex flex-col w-full">
          {message.content && (
            <div className="flex flex-col gap-4 text-left text-lg">
              <Markdown>{message.content}</Markdown>
            </div>
          )}
          {message.role === 'assistant' && (
            <MessageActions message={message} copyOnly />
          )}
        </div>
      </div>
    </motion.div>
  );
};

export const ThinkingMessage = () => {
  const role = 'assistant';

  return (
    <motion.div
      className="w-full mx-auto max-w-3xl px-4 group/message "
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1, transition: { delay: 0.2 } }}
      data-role={role}
    >
      <div
        className={cx(
          'flex gap-4 w-full max-w-2xl py-3 px-4 rounded-xl border border-border bg-background/90',
          'group-data-[role=user]/message:w-fit group-data-[role=user]/message:ml-auto',
          'group-data-[role=user]/message:bg-muted'
        )}
      >
        <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border">
          <SparklesIcon size={14} />
        </div>
      </div>
    </motion.div>
  );
};
