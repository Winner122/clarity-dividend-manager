;; Define the contract for managing dividends 
(define-fungible-token shares)
(define-fungible-token dividend-token)

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-insufficient-balance (err u101))
(define-constant err-zero-amount (err u102))
(define-constant err-already-claimed (err u103))
(define-constant err-invalid-vesting (err u104))
(define-constant err-not-vested (err u105))
(define-constant err-invalid-token (err u106))

;; Data vars
(define-data-var total-shares uint u0)
(define-data-var dividend-per-share uint u0)
(define-data-var total-dividends uint u0)

;; Data maps
(define-map claimed-dividends {shareholder: principal, period: uint, token: (string-ascii 32)} bool)
(define-map dividend-periods {period: uint, token: (string-ascii 32)} uint)
(define-map shareholder-info principal {last-claim-period: uint})
(define-map vesting-schedules 
  principal 
  {
    total-amount: uint,
    vesting-start: uint,
    vesting-duration: uint,
    claimed-amount: uint
  }
)

;; Supported dividend tokens
(define-map supported-tokens (string-ascii 32) bool)

;; Add supported token
(define-public (add-supported-token (token (string-ascii 32)))
  (if (is-eq tx-sender contract-owner)
    (begin
      (map-set supported-tokens token true)
      (ok true)
    )
    err-owner-only
  )
)

;; Issue new shares - only owner
(define-public (issue-shares (amount uint) (recipient principal))
    (if (and (is-eq tx-sender contract-owner) (> amount u0))
        (begin 
            (try! (ft-mint? shares amount recipient))
            (var-set total-shares (+ (var-get total-shares) amount))
            (ok true)
        )
        err-owner-only
    )
)

;; Create vesting schedule for shares
(define-public (create-vesting-schedule 
  (recipient principal) 
  (amount uint)
  (start-block uint)
  (duration uint)
)
  (if (and 
    (is-eq tx-sender contract-owner)
    (> amount u0)
    (>= duration u1)
  )
    (begin
      (try! (ft-mint? shares amount contract-owner))
      (map-set vesting-schedules recipient {
        total-amount: amount,
        vesting-start: start-block,
        vesting-duration: duration,
        claimed-amount: u0
      })
      (ok true)
    )
    err-owner-only
  )
)

;; Claim vested shares
(define-public (claim-vested-shares)
  (let (
    (vesting (unwrap! (map-get? vesting-schedules tx-sender) err-invalid-vesting))
    (vested-amount (get-vested-amount tx-sender block-height))
    (claimable (- vested-amount (get claimed-amount vesting)))
  )
    (asserts! (> claimable u0) err-not-vested)
    (begin
      (try! (ft-transfer? shares claimable contract-owner tx-sender))
      (map-set vesting-schedules tx-sender (merge vesting {claimed-amount: vested-amount}))
      (var-set total-shares (+ (var-get total-shares) claimable))
      (ok claimable)
    )
  )
)

;; Calculate vested amount
(define-read-only (get-vested-amount (holder principal) (current-block uint))
  (let (
    (vesting (unwrap! (map-get? vesting-schedules holder) u0))
    (elapsed (- current-block (get vesting-start vesting)))
  )
    (if (>= elapsed (get vesting-duration vesting))
      (get total-amount vesting)
      (/ (* (get total-amount vesting) elapsed) (get vesting-duration vesting))
    )
  )
)

;; Declare new dividend period and deposit dividends
(define-public (declare-dividends (amount uint) (period uint) (token (string-ascii 32)))
    (let ((is-supported (default-to false (map-get? supported-tokens token))))
      (if (and (is-eq tx-sender contract-owner) (> amount u0) is-supported)
          (begin
              (map-set dividend-periods {period: period, token: token} amount)
              (var-set dividend-per-share (/ amount (var-get total-shares)))
              (var-set total-dividends (+ (var-get total-dividends) amount))
              (ok true)
          )
          (if (not is-supported) 
              err-invalid-token
              err-owner-only
          )
      )
    )
)

;; Claim dividends for a specific period and token
(define-public (claim-dividends (period uint) (token (string-ascii 32)))
    (let (
        (shares-owned (ft-get-balance shares tx-sender))
        (claimed (default-to false (map-get? claimed-dividends {shareholder: tx-sender, period: period, token: token})))
        (period-amount (unwrap! (map-get? dividend-periods {period: period, token: token}) err-invalid-token))
        (dividend-amount (* shares-owned (/ period-amount (var-get total-shares))))
    )
        (asserts! (not claimed) err-already-claimed)
        (asserts! (> dividend-amount u0) err-zero-amount)
        (begin
            (map-set claimed-dividends {shareholder: tx-sender, period: period, token: token} true)
            (ok dividend-amount)
        )
    )
)

;; Read-only functions
(define-read-only (get-shares-balance (shareholder principal))
    (ok (ft-get-balance shares shareholder))
)

(define-read-only (get-dividend-amount (period uint) (token (string-ascii 32)))
    (ok (default-to u0 (map-get? dividend-periods {period: period, token: token})))
)

(define-read-only (get-total-shares)
    (ok (var-get total-shares))
)

(define-read-only (is-dividend-claimed (shareholder principal) (period uint) (token (string-ascii 32)))
    (ok (default-to false (map-get? claimed-dividends {shareholder: shareholder, period: period, token: token})))
)

(define-read-only (get-vesting-schedule (holder principal))
    (ok (map-get? vesting-schedules holder))
)

(define-read-only (is-token-supported (token (string-ascii 32)))
    (ok (default-to false (map-get? supported-tokens token)))
)
