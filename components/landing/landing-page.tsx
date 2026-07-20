'use client'

import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
} from 'motion/react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowDownRight, ArrowRight, Check, Menu, MoveUpRight, X } from 'lucide-react'
import { useRef, useState, type CSSProperties, type ReactNode } from 'react'

import { StorefrontStage } from './storefront-stage'
import styles from './landing-page.module.css'

const STORY_STEPS = [
  {
    number: '01',
    label: 'Bring what you have',
    title: 'Start with a photo. Not a setup wizard.',
    copy: 'Upload the menu, product shots, or notes already sitting in your camera roll. Drops turns the useful bits into products, prices, and stock.',
  },
  {
    number: '02',
    label: 'Open the doors',
    title: 'Your storefront becomes a place.',
    copy: 'Choose the mood, add a name, and publish a world buyers can actually step into. Your storefront lives right here.',
  },
  {
    number: '03',
    label: 'Run the busy hour',
    title: 'Orders arrive already organised.',
    copy: 'HitPay confirms payment, stock updates for everyone, and the packing list is waiting when the window closes.',
  },
] as const

const ORDER_ROWS = [
  ['Aisha R.', 'Set B · 70 puri', '$65', 'PAID'],
  ['Marcus T.', 'Linen day shirt', '$42', 'PAID'],
  ['Priya S.', 'Sunday supper set', '$35', 'PAID'],
] as const

function Mark({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className={`${styles.mark} ${inverse ? styles.markInverse : ''}`} aria-label="Drops">
      drops<span>.</span>
    </span>
  )
}

function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 34 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-12%' }}
      transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

function StoryVisual({ active }: { active: number }) {
  return (
    <div className={styles.storyVisual}>
      <div className={styles.storyVisualTopline}>
        <span>DROP BUILDER</span>
        <span>0{active + 1} / 03</span>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        {active === 0 && (
          <motion.div
            key="photo"
            className={styles.builderPhoto}
            initial={{ opacity: 0, y: 18, rotate: -1.5 }}
            animate={{ opacity: 1, y: 0, rotate: -2.5 }}
            exit={{ opacity: 0, y: -18, rotate: 1 }}
            transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className={styles.photoPaper}>
              <Image
                src="/prototype/panipuri-b.jpg"
                alt="A menu photo ready to become a storefront"
                fill
                sizes="(max-width: 760px) 80vw, 42vw"
              />
            </div>
            <span className={styles.scanLine} />
            <div className={styles.extractionNote}>
              <Check size={14} /> 4 products found
            </div>
          </motion.div>
        )}

        {active === 1 && (
          <motion.div
            key="store"
            className={styles.builderStore}
            initial={{ opacity: 0, scale: 0.94, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.03, y: -14 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <Image
              src="/hero/virtual-world-storefront-exterior.png"
              alt="The generated virtual storefront"
              fill
              sizes="(max-width: 760px) 90vw, 46vw"
            />
            <span className={styles.worldReady}>WORLD READY</span>
          </motion.div>
        )}

        {active === 2 && (
          <motion.div
            key="orders"
            className={styles.builderOrders}
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className={styles.orderSummary}>
              <span>Tonight&apos;s Roti Supper</span>
              <strong>$142</strong>
              <small>3 orders · all paid</small>
            </div>
            <div className={styles.orderList}>
              {ORDER_ROWS.map(([name, item, price, status]) => (
                <div key={name}>
                  <span>{name}</span>
                  <span>{item}</span>
                  <strong>{price}</strong>
                  <b>{status}</b>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function StorySection() {
  const sectionRef = useRef<HTMLElement>(null)
  const [active, setActive] = useState(0)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start 65%', 'end 55%'],
  })

  useMotionValueEvent(scrollYProgress, 'change', (value) => {
    setActive(Math.min(2, Math.floor(value * 3)))
  })

  return (
    <section className={styles.storySection} id="how-it-works" ref={sectionRef}>
      <div className={styles.sectionTopline}>
        <span>02 / HOW IT WORKS</span>
        <span>FROM CAMERA ROLL TO OPEN DOORS</span>
      </div>
      <div className={styles.storyHeading}>
        <Reveal>
          <p className={styles.eyebrow}>THREE SMALL MOVES</p>
          <h2>
            A shop link in minutes.
            <span>A world when they arrive.</span>
          </h2>
        </Reveal>
      </div>
      <div className={styles.storyGrid}>
        <div className={styles.storySticky}>
          <StoryVisual active={active} />
        </div>
        <div className={styles.storySteps}>
          {STORY_STEPS.map((step, index) => (
            <article
              key={step.number}
              className={`${styles.storyStep} ${active === index ? styles.storyStepActive : ''}`}
            >
              <span>{step.number}</span>
              <p>{step.label}</p>
              <h3>{step.title}</h3>
              <div>{step.copy}</div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const reduceMotion = useReducedMotion()
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 130, damping: 28, mass: 0.25 })

  return (
    <main className={styles.page}>
      <motion.div className={styles.scrollProgress} style={{ scaleX: progress }} />

      <header className={styles.navWrap}>
        <nav className={styles.nav} aria-label="Main navigation">
          <Link href="/" className={styles.logo} onClick={() => setMenuOpen(false)}>
            <Mark />
          </Link>
          <div className={`${styles.navLinks} ${menuOpen ? styles.navLinksOpen : ''}`}>
            <Link href="#why-drops" onClick={() => setMenuOpen(false)}>Why Drops</Link>
            <Link href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</Link>
            <Link href="#live" onClick={() => setMenuOpen(false)}>Live commerce</Link>
            <Link href="/new" className={styles.navCta} onClick={() => setMenuOpen(false)}>
              Open a store <MoveUpRight size={14} />
            </Link>
          </div>
          <button
            className={styles.menuButton}
            type="button"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </nav>
      </header>

      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.heroStageWrap}>
          <StorefrontStage />
        </div>
        <div className={styles.heroCopy}>
          <motion.p
            className={styles.heroEyebrow}
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.65 }}
          >
            STOREFRONTS FOR PEOPLE WITH A FOLLOWING
          </motion.p>
          <h1 id="hero-title" className={styles.heroTitle}>
            {['From one photo', 'to a world', 'people can shop.'].map((line, index) => (
              <span className={index === 2 ? styles.heroTitleAccent : ''} key={line}>
                <motion.i
                  initial={reduceMotion ? false : { y: '110%' }}
                  animate={{ y: 0 }}
                  transition={{ delay: 0.32 + index * 0.1, duration: 0.82, ease: [0.22, 1, 0.36, 1] }}
                >
                  {line}
                </motion.i>
              </span>
            ))}
          </h1>
          <motion.p
            className={styles.heroDescription}
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            Turn a menu or product photo into a live virtual storefront—with payments, stock, and the packing list already inside.
          </motion.p>
          <motion.div
            className={styles.heroActions}
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.87, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          >
            <Link href="/new" className={styles.primaryButton}>
              Create my store <ArrowRight size={17} />
            </Link>
            <Link href="/rotiwife/tonight" className={styles.secondaryButton}>
              Enter a live drop <ArrowDownRight size={17} />
            </Link>
          </motion.div>
          <motion.div
            className={styles.heroTrust}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.05, duration: 0.7 }}
          >
            <span><Check size={12} /> HitPay checkout</span>
            <span><Check size={12} /> Live stock</span>
            <span><Check size={12} /> No code</span>
          </motion.div>
        </div>
      </section>

      <div className={styles.marquee} aria-hidden="true">
        <div className={styles.marqueeTrack}>
          {[0, 1].map((loop) => (
            <div key={loop}>
              <span>ONE PHOTO</span><i />
              <span>ONE LINK</span><i />
              <span>A WHOLE WORLD</span><i />
              <span>OPEN FOR THE MOMENT</span><i />
            </div>
          ))}
        </div>
      </div>

      <section className={styles.statementSection} id="why-drops">
        <div className={styles.sectionTopline}>
          <span>01 / WHY DROPS</span>
          <span>THE LINK IS THE PLACE</span>
        </div>
        <Reveal className={styles.statementCopy}>
          <p className={styles.eyebrow}>SELL WHERE THE ENERGY IS</p>
          <h2>
            Stop sending instructions.
            <span>Send an address.</span>
          </h2>
          <p>
            Your audience already knows why they want it. Drops gives the moment somewhere to happen—one shareable world where everyone sees the same stock, the same countdown, and the same open door.
          </p>
        </Reveal>
        <div className={styles.momentStrip}>
          <motion.figure
            className={styles.momentTall}
            initial={reduceMotion ? false : { opacity: 0, y: 52 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-15%' }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <Image src="/prototype/puri-close.jpg" alt="Fresh panipuri for a limited drop" fill sizes="(max-width: 760px) 70vw, 31vw" />
            <figcaption>made tonight / gone tonight</figcaption>
          </motion.figure>
          <motion.figure
            className={styles.momentWide}
            initial={reduceMotion ? false : { opacity: 0, y: 72 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-15%' }}
            transition={{ duration: 0.9, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          >
            <Image src="/prototype/linen-wide.jpg" alt="A limited linen collection" fill sizes="(max-width: 760px) 88vw, 48vw" />
            <figcaption>small batch / big entrance</figcaption>
          </motion.figure>
          <motion.aside
            className={styles.momentNote}
            initial={reduceMotion ? false : { opacity: 0, rotate: 4, scale: 0.92 }}
            whileInView={{ opacity: 1, rotate: -2, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.75, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <strong>00</strong>
            <span>payment screenshots</span>
          </motion.aside>
        </div>
      </section>

      <StorySection />

      <section className={styles.liveSection} id="live">
        <div className={styles.liveGlow} aria-hidden="true" />
        <div className={`${styles.sectionTopline} ${styles.sectionToplineDark}`}>
          <span>03 / LIVE COMMERCE</span>
          <span>THE BUSY HOUR, ORGANISED</span>
        </div>
        <Reveal className={styles.liveHeading}>
          <p className={styles.eyebrow}>EVERY ARRIVAL CHANGES THE ROOM</p>
          <h2>
            It feels live
            <span>because it is.</span>
          </h2>
          <p>Buyers enter together. Stock moves for everyone. A sale becomes part of the atmosphere—not another admin task.</p>
        </Reveal>
        <div className={styles.liveConsole}>
          <div className={styles.liveCount}>
            <span>SHOPPING NOW</span>
            <strong>24</strong>
            <small><i /> LIVE</small>
          </div>
          <div className={styles.liveAvatars} aria-hidden="true">
            {['#efa2b3', '#91a9c7', '#a6b477', '#d6a06e', '#b69bcf', '#e6bd73'].map((color, index) => (
              <span
                key={color}
                style={
                  {
                    '--live-avatar': color,
                    '--avatar-index': index,
                    '--avatar-top': `${18 + (index % 3) * 24}%`,
                    '--avatar-left': `${12 + (index % 2) * 48}%`,
                  } as CSSProperties
                }
              >
                <i />
              </span>
            ))}
          </div>
          <div className={styles.liveOrders}>
            <div className={styles.liveOrdersHead}>
              <span>LATEST ORDERS</span>
              <span>SYNCED NOW</span>
            </div>
            {ORDER_ROWS.map(([name, item, price, status], index) => (
              <motion.div
                key={name}
                initial={reduceMotion ? false : { opacity: 0, x: 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              >
                <span>0{index + 1}</span>
                <span>{name}<small>{item}</small></span>
                <strong>{price}</strong>
                <b><i /> {status}</b>
              </motion.div>
            ))}
          </div>
        </div>
        <div className={styles.liveFacts}>
          <div><strong>05:00</strong><span>minute claim window</span></div>
          <div><strong>1</strong><span>shared stock count</span></div>
          <div><strong>0</strong><span>orders to reconcile</span></div>
        </div>
      </section>

      <section className={styles.finalSection}>
        <div className={styles.finalOrbit} aria-hidden="true" />
        <div className={styles.finalTopline}>
          <Mark inverse />
          <span>BUILT FOR THE NEXT THING YOU MAKE</span>
        </div>
        <Reveal className={styles.finalCopy}>
          <p>THE DOORS ARE YOURS</p>
          <h2>
            Your next drop
            <span>deserves a world.</span>
          </h2>
          <Link href="/new" className={styles.finalButton}>
            Open my store <MoveUpRight size={19} />
          </Link>
        </Reveal>
        <footer className={styles.footer}>
          <span>© 2026 DROPS</span>
          <span>FOR PEOPLE, NOT CORPORATIONS.</span>
          <span>SINGAPORE / MADE FOR THE MOMENT</span>
        </footer>
      </section>
    </main>
  )
}
