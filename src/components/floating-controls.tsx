import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/contexts/language-context";
import { ThemeSwitcher } from "./theme-switcher";

/**
 * 悬浮控制组件
 * 固定在页面右下角，包含主题切换和语言切换。
 */
export function FloatingControls() {
    const { language, setLanguage } = useLanguage();

    const toggleLanguage = () => {
        setLanguage(language === 'en' ? 'zh' : 'en');
    };

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-4">
            <ThemeSwitcher />
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
