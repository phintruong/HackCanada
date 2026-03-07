import { useWindowDimensions } from 'react-native';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const breakpoint: Breakpoint =
    width >= 1024 ? 'desktop' : width >= 768 ? 'tablet' : 'mobile';

  const isMobile = breakpoint === 'mobile';
  const isDesktop = breakpoint === 'desktop';

  function responsive<T>(mobile: T, tablet: T, desktop?: T): T {
    if (breakpoint === 'desktop') return desktop ?? tablet;
    if (breakpoint === 'tablet') return tablet;
    return mobile;
  }

  return { width, height, breakpoint, isMobile, isDesktop, responsive };
}
