import { useState, useEffect } from 'react';
import { Settings, Save, Key, Server, Bot } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useLanguage } from "@/lib/contexts/language-context";
import { toast } from "sonner";

export function SettingsModal() {
    const { t } = useLanguage();
    const [apiKey, setApiKey] = useState('');
    const [baseUrl, setBaseUrl] = useState('');
    const [model, setModel] = useState('gpt-4o');
    const [provider, setProvider] = useState('openai');
    const [isOpen, setIsOpen] = useState(false);

    // Load from LocalStorage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setApiKey(localStorage.getItem('hn_insight_api_key') || '');
            setBaseUrl(localStorage.getItem('hn_insight_base_url') || '');
            setModel(localStorage.getItem('hn_insight_model') || 'gpt-4o');
            setProvider(localStorage.getItem('hn_insight_provider') || 'openai');
        }
    }, [isOpen]);

    const handleSave = () => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('hn_insight_api_key', apiKey);
            localStorage.setItem('hn_insight_base_url', baseUrl);
            localStorage.setItem('hn_insight_model', model);
            localStorage.setItem('hn_insight_provider', provider);

            toast.success(t('Settings saved'), {
                description: t('Your API key will be used for future AI summaries.')
            });
            setIsOpen(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full h-12 w-12 shadow-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:scale-105 transition-transform"
                >
                    <Settings className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t('Settings') || 'Settings'}</DialogTitle>
                    <DialogDescription>
                        {t('Configure your own AI provider settings (BYOK).') || 'Configure your own AI provider settings (BYOK).'}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="provider" className="flex items-center gap-2">
                            <Bot className="w-4 h-4" />
                            Provider
                        </Label>
                        <select
                            id="provider"
                            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:focus-visible:ring-slate-300"
                            value={provider}
                            onChange={(e) => {
                                const newProvider = e.target.value;
                                setProvider(newProvider);
                                if (newProvider === 'minimax') {
                                    setBaseUrl('https://api.minimax.io/v1/text/chatcompletion_v2');
                                    setModel('MiniMax-M2.1');
                                } else {
                                    // Reset to defaults for OpenAI
                                    setBaseUrl('');
                                    setModel('gpt-4o');
                                }
                            }}
                        >
                            <option value="openai">OpenAI Compatible</option>
                            <option value="minimax">MiniMax</option>
                        </select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="api-key" className="flex items-center gap-2">
                            <Key className="w-4 h-4" />
                            API Key
                        </Label>
                        <Input
                            id="api-key"
                            type="password"
                            placeholder={provider === 'minimax' ? "MiniMax API Token" : "sk-..."}
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                        />
                        <p className="text-[10px] text-muted-foreground">
                            {t('Stored locally in your browser.')}
                        </p>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="base-url" className="flex items-center gap-2">
                            <Server className="w-4 h-4" />
                            {provider === 'minimax' ? 'Endpoint URL' : 'Base URL (Optional)'}
                        </Label>
                        <Input
                            id="base-url"
                            placeholder={provider === 'minimax' ? "https://api.minimax.io/v1/text/chatcompletion_v2" : "https://api.openai.com/v1"}
                            value={baseUrl}
                            onChange={(e) => setBaseUrl(e.target.value)}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="model" className="flex items-center gap-2">
                            <Bot className="w-4 h-4" />
                            Model Name
                        </Label>
                        <Input
                            id="model"
                            placeholder={provider === 'minimax' ? "MiniMax-M2.1" : "gpt-4o"}
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSave} className="w-full">
                        <Save className="w-4 h-4 mr-2" />
                        {t('Save Changes') || 'Save Changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
