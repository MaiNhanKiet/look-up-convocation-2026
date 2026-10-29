'use client';

import {
  ArrowUpRight,
  ExternalLink,
  ImageOff,
  Maximize2,
  X,
} from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { copy } from '@/lib/copy';
import { refreshLedImage } from '@/lib/lookup/refresh-led-image';
import {
  createClientKeyPair,
  openSealedJson,
} from '@/lib/security/sealed-payload';
import type { LedImageRefresh, PublicStudent } from '@/lib/types/student';
import styles from './ceremony.module.css';

export function LedPreview({
  student,
  correctionFormUrl,
}: {
  student: PublicStudent;
  correctionFormUrl: string | null;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const thumbRef = useRef<HTMLImageElement>(null);
  const dialogImageRef = useRef<HTMLImageElement>(null);
  const [imageUrl, setImageUrl] = useState(student.ledImageUrl);
  const [expiresAt, setExpiresAt] = useState(student.ledImageExpiresAt);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const renewing = useRef(false);
  const failedOnce = useRef(false);
  const failed = student.ledImageStatus === 'unavailable' || phase === 'error';

  const renew = useCallback(
    async (fromError: boolean) => {
      if (renewing.current) return;
      renewing.current = true;
      try {
        const channel = await createClientKeyPair();
        const sealed = await refreshLedImage({
          studentCode: student.studentCode,
          clientPublicKey: channel.publicKey,
        });
        const next = await openSealedJson<LedImageRefresh>(
          sealed,
          channel.privateKey,
        );
        if (!next.ok) {
          if (fromError) setPhase('error');
          return;
        }
        setImageUrl(next.ledImageUrl);
        setExpiresAt(next.ledImageExpiresAt);
        setPhase('loading');
      } catch {
        if (fromError) setPhase('error');
      } finally {
        renewing.current = false;
      }
    },
    [student.studentCode],
  );

  useEffect(() => {
    if (expiresAt == null || !imageUrl) return;
    const delay = Math.max(0, expiresAt - Date.now() - 20_000);
    const timer = window.setTimeout(() => {
      void renew(false);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [expiresAt, imageUrl, renew]);

  function onImageError() {
    if (renewing.current) return;
    if (failedOnce.current) {
      setPhase('error');
      return;
    }
    failedOnce.current = true;
    void renew(true);
  }

  function flyFromThumb(from: DOMRect) {
    const dialog = dialogRef.current;
    const target = dialogImageRef.current;
    const thumb = thumbRef.current;
    if (!dialog || !target || !thumb) return;
    const to = target.getBoundingClientRect();
    if (to.width === 0 || to.height === 0) {
      requestAnimationFrame(() => flyFromThumb(from));
      return;
    }
    const ratio = thumb.naturalWidth / thumb.naturalHeight || 16 / 9;
    const fromWidth = Math.min(from.width, from.height * ratio);
    const toWidth = Math.min(to.width, to.height * ratio);
    const scale = fromWidth / toWidth;
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);
    const duration = 560;

    thumb.style.visibility = 'hidden';
    dialog.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration,
      easing: 'ease-out',
      pseudoElement: '::backdrop',
    });
    target
      .animate(
        [
          { transform: `translate(${dx}px, ${dy}px) scale(${scale})` },
          { transform: 'translate(0, 0) scale(1)' },
        ],
        { duration, easing: 'cubic-bezier(0.32, 0.72, 0, 1)' },
      )
      .finished.then(
        () => delete dialog.dataset.flying,
        () => delete dialog.dataset.flying,
      );
  }

  function openLed() {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    const reduce = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const from = thumbRef.current?.getBoundingClientRect();
    if (!reduce && from) dialog.dataset.flying = 'true';
    document.documentElement.classList.add('led-scroll-lock');
    dialog.showModal();
    if (!reduce && from) requestAnimationFrame(() => flyFromThumb(from));
  }

  function closeLed() {
    const dialog = dialogRef.current;
    const target = dialogImageRef.current;
    const thumb = thumbRef.current;
    if (!dialog?.open || dialog.dataset.closing) return;
    const reduce = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (reduce || !target || !thumb) {
      dialog.close();
      return;
    }
    const from = target.getBoundingClientRect();
    const to = thumb.getBoundingClientRect();
    const ratio = thumb.naturalWidth / thumb.naturalHeight || 16 / 9;
    const fromWidth = Math.min(from.width, from.height * ratio);
    const toWidth = Math.min(to.width, to.height * ratio);
    const scale = toWidth / fromWidth;
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    const duration = 460;

    dialog.dataset.closing = 'true';
    const backdrop = dialog.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration,
      easing: 'ease-in',
      fill: 'forwards',
      pseudoElement: '::backdrop',
    });
    const flight = target.animate(
      [
        { transform: 'translate(0, 0) scale(1)' },
        { transform: `translate(${dx}px, ${dy}px) scale(${scale})` },
      ],
      { duration, easing: 'cubic-bezier(0.32, 0.72, 0, 1)', fill: 'forwards' },
    );
    const finish = () => {
      dialog.close();
      flight.cancel();
      backdrop.cancel();
    };
    flight.finished.then(finish, finish);
  }

  function releaseScroll() {
    document.documentElement.classList.remove('led-scroll-lock');
    if (dialogRef.current) {
      delete dialogRef.current.dataset.flying;
      delete dialogRef.current.dataset.closing;
    }
    thumbRef.current?.style.removeProperty('visibility');
  }

  useEffect(() => releaseScroll, []);

  const bothLinks = Boolean(student.invitationLink && student.ledExternalUrl);
  const invitation = (
    <div className={styles.invitationCell}>
      <span className={styles.invitationCellLabel}>Thư mời</span>
      {student.invitationLink ? (
        <a
          className={styles.invitationButton}
          href={student.invitationLink}
          target='_blank'
          rel='noopener noreferrer'
        >
          Mở thư mời
          <ExternalLink size={15} strokeWidth={1.8} aria-hidden='true' />
        </a>
      ) : (
        <span className={styles.invitationUnavailable}>{copy.updating}</span>
      )}
    </div>
  );
  const ledLink = student.ledExternalUrl ? (
    <div className={styles.ledLinkRow}>
      <span className={styles.invitationCellLabel}>Hình LED</span>
      <a
        className={styles.ledExternalButton}
        href={student.ledExternalUrl}
        target='_blank'
        rel='noopener noreferrer'
      >
        Mở hình LED
        <ExternalLink size={15} strokeWidth={1.8} aria-hidden='true' />
      </a>
    </div>
  ) : null;

  return (
    <figure
      className={styles.ledSection}
      data-compact={student.ledExternalUrl && !bothLinks ? 'true' : undefined}
      data-split={bothLinks ? 'true' : undefined}
    >
      {bothLinks ? (
        <div className={styles.linkSplit}>
          {invitation}
          {ledLink}
        </div>
      ) : (
        <>
          {invitation}
          {ledLink ?? (
            <>
              <figcaption className={styles.ledCaption}>
                <span>HÌNH LED</span>
              </figcaption>
              <div className={styles.previewMedia}>
                {imageUrl && phase !== 'error' ? (
                  <>
                    {phase === 'loading' ? (
                      <div
                        className={styles.imageSkeleton}
                        role='status'
                        aria-live='polite'
                        aria-label='Đang tải hình LED'
                      >
                        <span className={styles.imageSkeletonShimmer} />
                        <span className='sr-only'>Đang tải hình LED…</span>
                      </div>
                    ) : null}
                    <button
                      type='button'
                      className={styles.ledOpen}
                      data-ready={phase === 'ready' ? 'true' : 'false'}
                      disabled={phase !== 'ready'}
                      aria-label={`Xem hình LED của ${student.fullName} ở kích thước lớn`}
                      onClick={openLed}
                    >
                      <Image
                        src={imageUrl}
                        alt=''
                        fill
                        unoptimized
                        loading='eager'
                        referrerPolicy='no-referrer'
                        className={styles.ledImage}
                        onLoad={(event) => {
                          const image = event.currentTarget;
                          thumbRef.current = image;
                          const frame = image.closest('button');
                          if (
                            frame instanceof HTMLElement &&
                            image.naturalWidth > 0 &&
                            image.naturalHeight > 0
                          ) {
                            frame.style.aspectRatio = `${image.naturalWidth} / ${image.naturalHeight}`;
                          }
                          setPhase('ready');
                        }}
                        onError={onImageError}
                      />
                    </button>
                  </>
                ) : (
                  <div className={styles.imageFallback}>
                    <ImageOff size={25} strokeWidth={1.2} aria-hidden='true' />
                    <p>
                      {failed ? 'Hình LED đang được cập nhật' : copy.updating}
                    </p>
                    <span>{failed && 'Bạn có thể tra cứu lại sau.'}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
      {imageUrl && !student.ledExternalUrl && phase !== 'error' ? (
        <button
          type='button'
          className={styles.previewButton}
          data-ready={phase === 'ready' ? 'true' : 'false'}
          disabled={phase !== 'ready'}
          tabIndex={phase === 'ready' ? 0 : -1}
          aria-hidden={phase === 'ready' ? undefined : true}
          onClick={openLed}
        >
          Xem kích thước lớn <Maximize2 size={15} aria-hidden='true' />
        </button>
      ) : null}
      <div className={styles.driveLinkRow}>
        <span className={styles.invitationCellLabel}>Ảnh Profile</span>
        {student.driveLink ? (
          <a
            className={styles.ledExternalButton}
            href={student.driveLink}
            target='_blank'
            rel='noopener noreferrer'
          >
            Mở Ảnh Profile
            <ExternalLink size={15} strokeWidth={1.8} aria-hidden='true' />
          </a>
        ) : (
          <span className={styles.invitationUnavailable}>{copy.updating}</span>
        )}
      </div>
      <div
        className={styles.ledFooter}
        data-align={correctionFormUrl ? undefined : 'center'}
      >
        <p className={styles.ledNote}>
          Mong bạn hãy dành chút thời gian kiểm tra thông tin nhé.
          {correctionFormUrl
            ? ' Nếu có sai sót, bạn có thể gửi yêu cầu điều chỉnh ngay bên cạnh.'
            : null}
        </p>
        {correctionFormUrl ? (
          <a
            href={correctionFormUrl}
            className={styles.correctionButton}
            target='_blank'
            rel='noopener noreferrer'
          >
            Gửi yêu cầu
            <ArrowUpRight size={15} aria-hidden='true' />
          </a>
        ) : null}
      </div>
      {imageUrl ? (
        <dialog
          ref={dialogRef}
          className={styles.ledDialog}
          aria-label={`Hình LED của ${student.fullName}`}
          onClick={(event) => {
            if (event.target === dialogRef.current) closeLed();
          }}
          onCancel={(event) => {
            event.preventDefault();
            closeLed();
          }}
          onClose={releaseScroll}
        >
          <Image
            src={imageUrl}
            alt={`Hình LED của ${student.fullName}`}
            width={1600}
            height={900}
            unoptimized
            loading='eager'
            referrerPolicy='no-referrer'
            className={styles.dialogImage}
            onLoad={(event) => {
              dialogImageRef.current = event.currentTarget;
            }}
            onError={onImageError}
          />
          <button
            type='button'
            className={styles.dialogClose}
            onClick={closeLed}
            aria-label='Đóng hình LED'
          >
            <X size={18} aria-hidden='true' />
          </button>
        </dialog>
      ) : null}
    </figure>
  );
}
