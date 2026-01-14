'use client';

import * as React from "react"
import { Moon, Sun, Laptop } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

export function ThemeSwitcher() {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    // Avoid hydration mismatch
    React.useEffect(() => {
        setMounted(true)
    }, [])

    const cycleTheme = () => {
        if (theme === 'light') setTheme('dark')
        else if (theme === 'dark') setTheme('system')
        else setTheme('light')
    }

    if (!mounted) {
        return (
            <Button
                variant="outline"
                size="icon"
                className="rounded-full h-12 w-12 shadow-lg border-2 border-primary/20 bg-background"
                disabled
            >
                <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all" />
                <span className="sr-only">Toggle theme</span>
            </Button>
        )
    }

    return (
        <Button
            variant="outline"
            size="icon"
            onClick={cycleTheme}
            className="rounded-full h-12 w-12 shadow-lg border-2 border-primary/20 hover:scale-105 transition-transform bg-background text-foreground"
        >
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 hidden data-[state=light]:block" data-state={theme === 'light' ? 'light' : 'other'} />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 hidden data-[state=dark]:block" data-state={theme === 'dark' ? 'dark' : 'other'} />
            <Laptop className="absolute h-[1.2rem] w-[1.2rem] scale-0 transition-all hidden data-[state=system]:block data-[state=system]:scale-100" data-state={theme === 'system' ? 'system' : 'other'} />

            {/* Fallback/Logic for icons based on current theme value directly if CSS classes fail, 
          but actually standard pattern is swapping based on class 'dark'. 
          Wait, we want a tri-state toggle visual. 
          Standard shadcn/ui toggle uses dropdown. Here we want a button cycle.
      */}
            {theme === 'light' && <Sun className="h-5 w-5" />}
            {theme === 'dark' && <Moon className="h-5 w-5" />}
            {theme === 'system' && <Laptop className="h-5 w-5" />}

            <span className="sr-only">Toggle theme</span>
        </Button>
    )
}
