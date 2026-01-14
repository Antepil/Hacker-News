'use client';

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/contexts/language-context";
import { Languages } from "lucide-react";

/**
 * 语言切换浮窗组件
 * 固定在页面右下角，用于切换全局语言状态 (中/En)。
 */
export function LanguageSwitcher() {
    const { language, setLanguage } = useLanguage();

    const toggleLanguage = () => {
        setLanguage(language === 'en' ? 'zh' : 'en');
    };

    return (
        <div className="fixed bottom-4 right-4 z-50">
            <Button
                onClick={toggleLanguage}
                size="icon"
                className="rounded-full h-12 w-12 shadow-lg border-2 border-primary/20 hover:scale-105 transition-transform"
            >
                {language === 'en' ? '中' : 'En'}
            </Button>
        </div>
    );
}
