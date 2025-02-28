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
(define-constant err-deadline-passed (err u107))
(define-constant err-contract-paused (err u108))
(define-constant max-supply u1000000000)

;; Data vars
(define-data-var total-shares uint u0)
(define-data-var dividend-per-share uint u0)
(define-data-var total-dividends uint u0)
(define-data-var contract-paused bool false)
(define-data-var claim-deadline uint u0)

;; Emergency pause
(define-public (set-pause-state (paused bool))
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    (var-set contract-paused paused)
    (ok true)))

;; Check not paused
(define-private (assert-not-paused)
  (asserts! (not (var-get contract-paused)) err-contract-paused))

;; Set claim deadline
(define-public (set-claim-deadline (deadline uint))
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    (var-set claim-deadline deadline)
    (ok true)))

;; Original maps and functionality remain...
[Previous implementation of maps and functions]

;; Enhanced claim-dividends with deadline check
(define-public (claim-dividends (period uint) (token (string-ascii 32)))
  (begin
    (assert-not-paused)
    (asserts! (< block-height (var-get claim-deadline)) err-deadline-passed)
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
        (ok dividend-amount)))))

;; Batch claim dividends
(define-public (batch-claim-dividends (periods (list 10 uint)) (token (string-ascii 32)))
  (begin
    (assert-not-paused)
    (fold claim-dividends-fold periods (ok true))))

(define-private (claim-dividends-fold (period uint) (previous-result (response bool uint)))
  (match previous-result
    success (claim-dividends period token)
    error error))
