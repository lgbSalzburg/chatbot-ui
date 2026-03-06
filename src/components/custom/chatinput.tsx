import { Textarea } from "../ui/textarea";
import { cx } from 'classix';
import { Button } from "../ui/button";
import { ArrowUpIcon } from "./icons"
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface ChatInputProps {
    question: string;
    setQuestion: (question: string) => void;
    onSubmit: (text?: string) => void;
    isLoading: boolean;
    isDisabled?: boolean;
    resetSuggestionsSignal?: number;
}

const suggestedActions = [
    {
        title: 'Wie lange dauert die Bearbeitung \nmeines Antrags?',
        label: '',
        action: 'Wie lange dauert die Bearbeitung meines Antrags?',
    },
    {
        title: 'Was ist der aktuelle Status \nmeines Antrags?',
        label: '',
        action: 'Was ist der aktuelle Status meines Antrags?',
    },
    {
        title: 'Wie hoch ist die Förderhöhe \ndieses Jahr?',
        label: '',
        action: 'Wie hoch ist die Förderhöhe dieses Jahr?',
    },
    {
        title: 'Wer hat Anspruch \nauf den Heizkostenzuschuss?',
        label: '',
        action: 'Wer hat Anspruch auf den Heizkostenzuschuss?',
    },
    {
        title: 'Welche Dokumente werden \nfür den Antrag benötigt?',
        label: '',
        action: 'Welche Dokumente werden für den Antrag benötigt?',
    },
    {
        title: 'Wann endet die \nFörderfrist?',
        label: '',
        action: 'Wann endet die Förderfrist?',
    },
];


export const ChatInput = ({ question, setQuestion, onSubmit, isLoading, isDisabled = false, resetSuggestionsSignal = 0 }: ChatInputProps) => {
    const [visibleSuggestionIndexes, setVisibleSuggestionIndexes] = useState<number[]>([]);
    const [nextSuggestionCursor, setNextSuggestionCursor] = useState<number>(0);

    const initializeSuggestions = (signal: number) => {
        const total = suggestedActions.length;
        if (total === 0) {
            setVisibleSuggestionIndexes([]);
            setNextSuggestionCursor(0);
            return;
        }

        const visibleCount = Math.min(2, total);
        const startIndex = ((signal * 2) % total + total) % total;
        const nextVisibleIndexes: number[] = [];
        for (let offset = 0; offset < visibleCount; offset += 1) {
            nextVisibleIndexes.push((startIndex + offset) % total);
        }

        setVisibleSuggestionIndexes(nextVisibleIndexes);
        setNextSuggestionCursor((startIndex + visibleCount) % total);
    };

    useEffect(() => {
        initializeSuggestions(resetSuggestionsSignal);
    }, [resetSuggestionsSignal]);

    return(
    <div className="relative w-full flex flex-col gap-4">
            <div className="hidden md:grid sm:grid-cols-2 gap-2 w-full">
                {visibleSuggestionIndexes.map((suggestionIndex, index) => {
                    const suggestedAction = suggestedActions[suggestionIndex];
                    if (!suggestedAction) return null;

                    return (
                    <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ delay: 0.05 * index }}
                    key={index}
                    className={index > 1 ? 'hidden sm:block' : 'block'}
                    >
                        <Button
                            variant="ghost"
                            disabled={isDisabled || isLoading}
                            onClick={ () => {
                                if (isDisabled || isLoading) return;
                                const text = suggestedAction.action;
                                onSubmit(text);

                                const total = suggestedActions.length;
                                if (total <= visibleSuggestionIndexes.length) return;

                                let replacementIndex = -1;
                                for (let step = 0; step < total; step += 1) {
                                    const candidate = (nextSuggestionCursor + step) % total;
                                    if (!visibleSuggestionIndexes.includes(candidate)) {
                                        replacementIndex = candidate;
                                        break;
                                    }
                                }

                                if (replacementIndex === -1) return;

                                setVisibleSuggestionIndexes((current) =>
                                    current.map((currentIndex, currentSlot) =>
                                        currentSlot === index ? replacementIndex : currentIndex
                                    )
                                );
                                setNextSuggestionCursor((replacementIndex + 1) % total);
                            }}
                            className="text-left border rounded-xl px-4 py-3.5 text-sm flex-1 gap-1 sm:flex-col w-full h-auto justify-start items-start"
                        >
                            <span className="font-medium whitespace-pre-line">{suggestedAction.title}</span>
                            <span className="text-muted-foreground">
                            {suggestedAction.label}
                            </span>
                        </Button>
                    </motion.div>
                )})}
            </div>
        <input
        type="file"
        className="fixed -top-4 -left-4 size-0.5 opacity-0 pointer-events-none"
        multiple
        tabIndex={-1}
        />

        <Textarea
        placeholder="Send a message..."
        className={cx(
            'min-h-[24px] max-h-[calc(75dvh)] overflow-hidden resize-none rounded-xl text-base bg-muted',
        )}
        value={question}
        disabled={isDisabled}
        onChange={(e) => setQuestion(e.target.value)}
        onKeyDown={(event) => {
            if (isDisabled) return;
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();

                if (isLoading) {
                    toast.error('Please wait for the model to finish its response!');
                } else {
                    onSubmit();
                }
            }
        }}
        rows={3}
        autoFocus
        />

        <Button 
            className="rounded-full p-1.5 h-fit absolute bottom-2 right-2 m-0.5 border dark:border-zinc-600"
            onClick={() => onSubmit(question)}
            disabled={isDisabled || question.length === 0}
        >
            <ArrowUpIcon size={14} />
        </Button>
    </div>
    );
}
