'use client'

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import Image from 'next/image'
import { useCallback, useEffect, useState } from 'react'

import styles from './landing-page.module.css'
import { StorefrontCanvas } from './storefront-model'

const PURCHASES = [
  { name: 'Aisha', item: 'Set B · 70 puri', price: '$65', tint: '#dca2ad' },
  { name: 'Marcus', item: 'Linen day shirt', price: '$42', tint: '#91a9c7' },
  { name: 'Priya', item: 'Sunday supper set', price: '$35', tint: '#a6b477' },
  { name: 'Siti', item: 'Cloud milk cleanser', price: '$26', tint: '#d6a06e' },
] as const

export function StorefrontStage() {
  const reduceMotion = useReducedMotion()
  const [purchaseIndex, setPurchaseIndex] = useState(0)
  const [modelReady, setModelReady] = useState(false)
  const markModelReady = useCallback(() => setModelReady(true), [])

  useEffect(() => {
    if (reduceMotion) return
    const timer = window.setInterval(
      () => setPurchaseIndex((index) => (index + 1) % PURCHASES.length),
      3_200,
    )
    return () => window.clearInterval(timer)
  }, [reduceMotion])

  const purchase = PURCHASES[purchaseIndex]

  return (
    <motion.div
      className={styles.storefrontStage}
      initial={reduceMotion ? false : { opacity: 0, y: 28, scale: 0.965 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 1.05, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
    >
      <Image
        src="/hero/virtual-world-storefront-exterior.png"
        alt="A playful virtual popup shop in a sunlit plaza"
        fill
        priority
        sizes="(max-width: 900px) 100vw, 64vw"
        className={`${styles.storefrontImage} ${modelReady ? styles.storefrontImageReady : ''}`}
      />

      <div className={`${styles.storefrontCanvas} ${modelReady ? styles.storefrontCanvasReady : ''}`}>
        <StorefrontCanvas onReady={markModelReady} />
      </div>

      <div className={styles.storefrontAtmosphere} aria-hidden="true" />
      <div className={styles.storefrontGrid} aria-hidden="true" />

      <div className={styles.stageLabel}>
        <span className={styles.liveDot} />
        <span>Tonight&apos;s Roti Supper</span>
        <small>24 inside</small>
      </div>

      <div className={styles.purchaseRail} aria-live="polite">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={purchase.name}
            className={styles.purchaseToast}
            initial={reduceMotion ? false : { opacity: 0, x: -24, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className={styles.purchaseAvatar} style={{ background: purchase.tint }}>
              {purchase.name.slice(0, 1)}
            </span>
            <span className={styles.purchaseCopy}>
              <strong>{purchase.name} just bought</strong>
              <span>{purchase.item}</span>
            </span>
            <b>{purchase.price}</b>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className={styles.stageHint}>
        <span>LIVE PLAZA / 01</span>
        <i />
        <span>buyers are arriving</span>
      </div>
    </motion.div>
  )
}
