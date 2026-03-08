'use client';

import Link from 'next/link';
import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
import { FeatureSteps } from '@/components/ui/feature-section';

const MotionLink = motion.create(Link);
const ease = [0.22, 1, 0.36, 1] as const;

function FadeUp({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 32 }}
      transition={{ duration: 0.7, ease, delay }}
    >
      {children}
    </motion.div>
  );
}

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
};

const showcaseFeatures = [
  {
    label: 'Live Congestion',
    title: 'Real-time ER occupancy',
    description: 'Color-coded circles on every hospital show live congestion — green means capacity, red means overwhelmed.',
  },
  {
    label: 'Smart Routing',
    title: 'AI-powered triage & routing',
    description: 'Enter symptoms, get a severity score, and see the optimal hospital factoring in drive time, wait time, and specialty.',
  },
  {
    label: 'ER Simulation',
    title: 'Plan new ER placement',
    description: 'Drop a proposed ER, set capacity, run a Voronoi simulation — watch patient flow redistribute across the network.',
  },
];

export default function Landing() {
  const showcaseRef = useRef<HTMLDivElement>(null);

  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroY = useTransform(heroProgress, [0, 1], ['0%', '30%']);
  const heroOpacity = useTransform(heroProgress, [0, 0.8], [1, 0]);


  return (
    <div className="lp">
      {/* ───── TOP NAV ───── */}
      <motion.div
        className="fixed top-0 left-0 right-0 z-[100] flex justify-center pt-5"
        initial={{ opacity: 0, y: -24, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.7, delay: 0.3, ease }}
      >
        <motion.div
          className="lp-nav-pill"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={staggerItem}>
            <Link href="/" className="lp-nav-logo">
              <img src="/logo.png" alt="ERoute" className="lp-nav-logo-img" />
            </Link>
          </motion.div>
          <motion.div className="lp-nav-divider" variants={staggerItem} />
          <motion.div variants={staggerItem}>
            <MotionLink
              href="/map?mode=government"
              className="lp-nav-btn lp-nav-btn--secondary"
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/><path d="M9 9v.01"/><path d="M9 12v.01"/><path d="M9 15v.01"/><path d="M9 18v.01"/></svg>
              Government
            </MotionLink>
          </motion.div>
          <motion.div variants={staggerItem}>
            <MotionLink
              href="/map?mode=civilian"
              className="lp-nav-btn lp-nav-btn--primary"
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              Find an ER
            </MotionLink>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* ───── HERO (fixed background, parallax) ───── */}
      <section ref={heroRef} className="lp-hero-section">
        <motion.div className="lp-hero-bg" style={{ y: heroY, opacity: heroOpacity }}>
          <img src="/thumb.jpg" alt="" className="lp-hero-img" draggable={false} />
          <div className="lp-hero-vignette" />
        </motion.div>

        <div className="lp-hero-content">
          <motion.h1
            className="lp-hero-title"
            initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.9, delay: 0.4, ease }}
          >
            ERoute.
          </motion.h1>
          <motion.p
            className="lp-hero-subtitle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.7, ease }}
          >
            Smart ER routing for Ontario
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.0, ease }}
          >
            <MotionLink
              href="/map"
              className="lp-hero-cta"
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
            >
              <span>Explore the Map</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </MotionLink>
          </motion.div>
        </div>

        <motion.div
          className="lp-scroll-indicator"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.8 }}
        >
          <motion.div
            className="lp-scroll-dot"
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
          />
        </motion.div>
      </section>

      {/* ───── STATEMENT (scrolls over hero) ───── */}
      <section className="lp-statement-section">
        <div className="lp-statement">
          <FadeUp>
            <motion.span
              className="lp-stmt-rule"
              initial={{ width: 0 }}
              whileInView={{ width: 48 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease }}
            />
          </FadeUp>

          <FadeUp delay={0.1}>
            <p className="lp-stmt-small">
              4.5 hours. That&apos;s the average ER wait in Ontario.
            </p>
          </FadeUp>

          <FadeUp delay={0.2}>
            <div className="lp-stmt-block">
              <h2 className="lp-stmt-line">Canada&apos;s ERs are overwhelmed.</h2>
              <h2 className="lp-stmt-line">Data can change that.</h2>
            </div>
          </FadeUp>

          <FadeUp delay={0.3}>
            <p className="lp-stmt-sub">
              Smarter placement. Faster triage. Shorter waits.
            </p>
          </FadeUp>

          <FadeUp delay={0.4}>
            <h2 className="lp-stmt-main">
              See the problem.<br /><span className="lp-stmt-gold">Place the solution.</span>
            </h2>
          </FadeUp>

          <FadeUp delay={0.5}>
            <div className="lp-stmt-ctas">
              <MotionLink
                href="/map?mode=government"
                className="lp-stmt-cta lp-stmt-cta--outline"
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/></svg>
                <span>Plan an ER</span>
              </MotionLink>
              <MotionLink
                href="/map?mode=civilian"
                className="lp-stmt-cta lp-stmt-cta--filled"
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              >
                <span>Find the Nearest ER</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </MotionLink>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ───── UI SHOWCASE (scrollytelling) ───── */}
      <section ref={showcaseRef} className="lp-showcase">
        <div className="lp-showcase-sticky">
          {/* Browser mockup */}
          <motion.div
            className="lp-browser"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease }}
          >
            <div className="lp-browser-bar">
              <div className="lp-browser-dots">
                <span /><span /><span />
              </div>
              <div className="lp-browser-url">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <span>eroute.ca/map</span>
              </div>
            </div>
            <div className="lp-browser-viewport">
              <iframe
                src="/map"
                title="ERoute Map Preview"
                className="lp-browser-iframe"
                loading="lazy"
              />
              <div className="lp-browser-iframe-overlay" />
            </div>
          </motion.div>

          {/* Feature carousel */}
          <ShowcaseCarousel features={showcaseFeatures} />
        </div>
      </section>

      {/* ───── HOW IT WORKS ───── */}
      <section className="lp-how-section">
        <FeatureSteps
          title="How ERoute Works"
          subtitle="Reducing ER congestion with data, simulation, and smart routing."
          features={[
            {
              step: 'Step 1',
              title: 'See Every ER at a Glance',
              content:
                "A live 3D map of Ontario's emergency rooms. Congestion circles show real-time occupancy — instantly see which ERs are overwhelmed and which have capacity.",
              image: '/carousel/busy-hospital-corridor-stockcake.jpg',
            },
            {
              step: 'Step 2',
              title: 'Simulate New ER Placement',
              content:
                'Drop a proposed ER anywhere on the map, set its capacity, and run a Voronoi simulation to see how patient flow redistributes across the network in real time.',
              image: '/carousel/NewmanRegional-Health2-600x400.jpg',
            },
            {
              step: 'Step 3',
              title: 'Get Routed to the Right ER',
              content:
                "Answer a few triage questions and get a severity-based recommendation — nearest hospital for emergencies, least congested for non-urgent visits.",
              image: '/carousel/istockphoto-600073876-612x612.jpg',
            },
          ]}
          autoPlayInterval={4000}
          imageHeight="h-[500px]"
        />
      </section>

      {/* ───── FOOTER ───── */}
      <FadeUp>
        <footer className="lp-footer">
          <div className="lp-footer-inner">
            <span className="lp-footer-brand">ERoute</span>
            <span className="lp-footer-sep">&middot;</span>
            <a href="https://github.com/phintruong/HackCanada" target="_blank" rel="noopener noreferrer">
              Source on GitHub
            </a>
            <span className="lp-footer-sep">&middot;</span>
            <span className="lp-footer-note">Built for Hack Canada 2025</span>
          </div>
        </footer>
      </FadeUp>
    </div>
  );
}

function ShowcaseCarousel({ features }: { features: typeof showcaseFeatures }) {
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isVisible = useInView(containerRef, { margin: '-100px' });

  const goTo = useCallback((idx: number) => {
    setDirection(idx > active ? 1 : -1);
    setActive(idx);
  }, [active]);

  useEffect(() => {
    if (!isVisible) return;
    intervalRef.current = setInterval(() => {
      setDirection(1);
      setActive((prev) => (prev + 1) % features.length);
    }, 4000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isVisible, features.length]);

  const cardVariants = {
    enter: (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0, scale: 0.95 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (d: number) => ({ x: d > 0 ? -60 : 60, opacity: 0, scale: 0.95 }),
  };

  return (
    <div ref={containerRef} className="lp-carousel">
      <div className="lp-carousel-viewport">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={active}
            custom={direction}
            variants={cardVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.4, ease }}
            className="lp-showcase-card"
          >
            <span className="lp-showcase-card-label">{features[active].label}</span>
            <h3 className="lp-showcase-card-title">{features[active].title}</h3>
            <p className="lp-showcase-card-desc">{features[active].description}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dots */}
      <div className="lp-carousel-dots">
        {features.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`lp-carousel-dot ${i === active ? 'lp-carousel-dot--active' : ''}`}
            aria-label={`Go to slide ${i + 1}`}
          >
            {i === active && (
              <motion.div
                className="lp-carousel-dot-fill"
                layoutId="carousel-dot"
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
