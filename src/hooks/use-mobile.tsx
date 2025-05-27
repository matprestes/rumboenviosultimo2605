
import * as React from "react"

const MOBILE_BREAKPOINT = 768 // Standard breakpoint for md in Tailwind

export function useIsMobile() {
  // Initialize with undefined to ensure behavior is consistent on server and initial client render
  // before the effect runs. This helps avoid hydration mismatches for components
  // that might render differently based on this hook during SSR.
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }

    // Set initial state once client-side environment is confirmed
    onChange(); 
    
    mql.addEventListener("change", onChange)
    
    return () => mql.removeEventListener("change", onChange)
  }, [])

  // Coerce to boolean. On server and first client paint, this will be false.
  // After client-side effect runs, it will reflect the true viewport state.
  return !!isMobile 
}
