import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  getDiaryEntries,
  deleteDiaryEntry,
  updateDiaryNote,
  DiaryEntry,
} from "@/lib/diary";
import { Trash2, Edit3, Check, X, ArrowLeft, BookOpen } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/UserMenu";
import { SiteNavBar } from "@/components/SiteNavBar";
import SEO from "@/components/SEO";

const Diary = () => {
  const { user, isLoading: authLoading, openAuthDialog } = useAuth();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const data = await getDiaryEntries(user.id);
    setEntries(data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    load();
  }, [authLoading, load]);

  const handleDelete = async (id: string) => {
    if (!user) return;
    const ok = await deleteDiaryEntry(user.id, id);
    if (ok) setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const handleSaveNote = async (id: string) => {
    if (!user) return;
    const ok = await updateDiaryNote(user.id, id, editNote);
    if (ok) {
      setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, note: editNote } : e)));
      setEditingId(null);
    }
  };

  const startEdit = (entry: DiaryEntry) => {
    setEditingId(entry.id);
    setEditNote(entry.note);
  };

  if (authLoading || loading) {
    return (
      <>
        <SEO
          title="Diário de Leituras | Tarot Místico"
          description="Acompanhe e guarde suas leituras de tarot na sua conta."
          path="/diario"
        />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className="text-muted-foreground font-body text-sm">A carregar...</p>
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <SEO
          title="Diário de Leituras | Tarot Místico"
          description="Acompanhe e guarde suas leituras de tarot na sua conta."
          path="/diario"
        />
        <div className="min-h-screen bg-background">
          <div className="max-w-lg mx-auto px-4 py-24 text-center">
          <BookOpen className="w-16 h-16 text-primary/30 mx-auto mb-6" />
          <h1 className="font-display text-2xl text-gold-gradient mb-3">Diário de Leituras</h1>
          <p className="text-muted-foreground font-body mb-8">
            Inicie sessão para ver e guardar as suas leituras na nuvem.
          </p>
          <Button
            type="button"
            onClick={() =>
              openAuthDialog(
                "O diário fica associado à sua conta. Você tem 3 interpretações por IA grátis por dia; depois pode usar créditos."
              )
            }
            className="font-display tracking-wider uppercase"
          >
            Entrar
          </Button>
          <Link
            to="/"
            className="block mt-8 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            ← Voltar à leitura
          </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO
        title="Diário de Leituras | Tarot Místico"
        description="Acompanhe e guarde suas leituras de tarot na sua conta."
        path="/diario"
      />
      <div className="min-h-screen bg-background">
      <SiteNavBar>
        <UserMenu />
      </SiteNavBar>
      <div className="max-w-4xl mx-auto px-4 py-12 pt-[max(5rem,calc(3rem+env(safe-area-inset-top)))]">
        <div className="flex items-center gap-4 mb-10">
          <Link
            to="/"
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-display text-3xl md:text-4xl text-gold-gradient">
              Diário de Leituras
            </h1>
            <p className="text-muted-foreground font-body text-sm mt-1">
              Suas leituras guardadas na conta {user.email}
            </p>
          </div>
        </div>

        {entries.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <BookOpen className="w-16 h-16 text-primary/20 mx-auto mb-4" />
            <p className="font-display text-lg text-muted-foreground mb-2">
              Seu diário está vazio
            </p>
            <p className="text-sm text-muted-foreground/70 mb-6">
              Faça uma leitura e guarde para começar seu diário.
            </p>
            <Link
              to="/"
              className="inline-block font-display tracking-[0.15em] uppercase text-sm px-6 py-3 rounded-lg bg-primary text-primary-foreground glow-gold hover:brightness-110 transition-all"
            >
              Fazer uma Leitura
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {entries.map((entry, i) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: i * 0.05 }}
                  className="border border-border rounded-xl bg-card overflow-hidden"
                >
                  <div
                    className="p-5 cursor-pointer hover:bg-card/80 transition-colors"
                    onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{entry.spreadEmoji}</span>
                        <div>
                          <h3 className="font-display text-sm text-primary">
                            {entry.spreadName}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {new Date(entry.date).toLocaleDateString("pt-BR", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1">
                          {entry.cards.map((card) => (
                            <span key={card.id} className="text-lg" title={card.name}>
                              {card.emoji}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {expandedId === entry.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 border-t border-border/50 pt-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                            {entry.cards.map((card, ci) => (
                              <div
                                key={`${entry.id}-${card.id}-${ci}`}
                                className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/30"
                              >
                                <span className="text-2xl mt-0.5">{card.emoji}</span>
                                <div className="min-w-0">
                                  <p className="text-xs text-primary/60 font-display tracking-wider uppercase">
                                    {entry.labels[ci]}
                                  </p>
                                  <p className="text-sm font-display text-primary">
                                    {card.name}
                                    {card.isReversed ? (
                                      <span className="text-destructive/90 font-body normal-case text-xs ml-1">
                                        (invertida)
                                      </span>
                                    ) : null}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                    {card.isReversed ? card.reversed : card.meaning}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="mb-3">
                            <p className="text-xs font-display tracking-wider uppercase text-primary/60 mb-2">
                              Anotação Pessoal
                            </p>
                            {editingId === entry.id ? (
                              <div className="flex gap-2">
                                <textarea
                                  value={editNote}
                                  onChange={(e) => setEditNote(e.target.value)}
                                  className="flex-1 bg-background border border-border rounded-lg p-3 text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
                                  rows={3}
                                  placeholder="Escreva suas reflexões sobre essa leitura..."
                                  autoFocus
                                />
                                <div className="flex flex-col gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleSaveNote(entry.id)}
                                    className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingId(null)}
                                    className="p-2 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p
                                className="text-sm text-foreground/70 italic cursor-pointer hover:text-foreground/90 transition-colors"
                                onClick={() => startEdit(entry)}
                              >
                                {entry.note || "Clique para adicionar uma anotação..."}
                              </p>
                            )}
                          </div>

                          <div className="flex justify-end gap-2 pt-2 border-t border-border/30">
                            <button
                              type="button"
                              onClick={() => startEdit(entry)}
                              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-primary/5"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              Editar Nota
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(entry.id)}
                              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors px-3 py-1.5 rounded-lg hover:bg-destructive/5"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Excluir
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
      </div>
    </>
  );
};

export default Diary;
