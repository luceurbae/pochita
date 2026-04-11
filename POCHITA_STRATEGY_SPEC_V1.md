# Pochita Strategy Spec v1

## Strategy Core

### 1. Trend Bias
- **15m = arah utama**
- **5m = momentum konfirmasi**
- **1m = entry timing**

Makna praktis:
- 15m dipakai untuk menentukan apakah market secara besar lebih condong bullish atau bearish
- 5m dipakai untuk melihat apakah momentum saat ini mendukung arah 15m
- 1m dipakai untuk timing entry, terutama candle close, wick rejection, dan kekuatan dorongan terakhir

---

### 2. Hard Skip
Pochita wajib **SKIP** jika salah satu kondisi berikut terpenuhi:

- `|diff| < 5`
- `RSI 1m ada di 45–55`
- `candle 5m kecil / indecisive`
- `15m dan 5m konflik`
- `conviction < threshold`

#### Definisi praktis:
- **diff kecil** = edge terlalu tipis, noise terlalu besar
- **RSI netral** = momentum belum jelas
- **5m kecil / indecisive** = body kecil, wick relatif besar, close tidak meyakinkan
- **15m dan 5m konflik** = arah utama dan momentum tidak sinkron
- **conviction rendah** = setup belum layak dieksekusi

Prinsipnya: kalau market tidak cukup jelas, **lebih baik tidak entry**.

---

### 3. Entry Conditions UP
Pochita hanya boleh entry **UP** jika mayoritas syarat ini terpenuhi:

- **15m bullish**
- **5m bullish atau breakout bullish**
- **1m close kuat / rejection bawah**
- **buy pressure > 52–55%**
- **diff mendukung arah UP**

#### Interpretasi:
- 15m bullish = arah besar sedang naik
- 5m bullish = momentum saat ini ikut naik
- 1m close kuat = candle 1m ditutup dekat high atau ada pantulan dari bawah
- buy pressure > 52–55% = order book mendukung sisi beli
- diff mendukung UP = harga saat ini cukup di atas atau berpotensi bergerak naik melewati price to beat

Kalau salah satu komponen utama rapuh, lebih aman **SKIP** daripada memaksa entry.

---

### 4. Entry Conditions DOWN
Pochita hanya boleh entry **DOWN** jika mayoritas syarat ini terpenuhi:

- **15m bearish**
- **5m bearish atau breakdown bearish**
- **1m rejection atas / close lemah**
- **buy pressure lemah**
- **diff mendukung arah DOWN**

#### Interpretasi:
- 15m bearish = arah besar sedang turun
- 5m bearish = momentum saat ini ikut turun
- 1m rejection atas / close lemah = ada penolakan dari atas atau candle ditutup lemah dekat low
- buy pressure lemah = bid tidak dominan, seller lebih kuat
- diff mendukung DOWN = harga saat ini berada di bawah atau cenderung turun dari price to beat

Kalau arah besar bearish tapi 1m justru kuat naik tanpa rejection, lebih baik **SKIP** dulu.

---

### 5. Conviction Tiers
Pochita membagi kualitas setup ke 4 tier:

- **90–100 = A+ setup**
- **80–89 = A setup**
- **70–79 = B setup**
- **<70 = no trade**

#### Arti tier:
- **A+** = alignment sangat bersih, momentum jelas, pressure mendukung, setup premium
- **A** = setup bagus dan layak ditembak
- **B** = masih layak, tapi bukan setup terbaik
- **<70** = terlalu banyak noise, konflik, atau keyakinan belum cukup

Threshold minimum saat ini:
- **Conviction minimal = 70**

---

## Prinsip Inti Pochita
Pochita bukan bot yang harus selalu entry.
Pochita adalah **sniper trader**.

Aturan mental utamanya:
- **Skip adalah posisi juga**
- **Arah utama lebih penting dari noise kecil**
- **Momentum harus konfirmasi trend, bukan melawannya**
- **Entry hanya saat market cukup jelas**
- **Conviction lebih penting daripada jumlah trade**

---

## Tujuan Implementasi
Spec v1 ini dipakai sebagai fondasi untuk refactor logic `ai-analyze.js`, supaya Pochita tidak hanya “membaca data”, tapi benar-benar punya rule engine yang konsisten.

Target implementasi berikutnya:
1. hitung trend 15m, 5m, dan 1m secara eksplisit
2. deteksi candle 5m indecisive
3. klasifikasikan candle 1m: strong close / rejection bawah / rejection atas / weak close
4. pakai buy pressure sebagai filter objektif
5. log conviction secara rapi
6. pastikan `conviction < 70` otomatis jadi SKIP

---

## Ringkasan Singkat
Pochita v1 bekerja dengan urutan:
1. baca arah utama dari **15m**
2. cek konfirmasi momentum dari **5m**
3. cari timing entry dari **1m**
4. buang kondisi jelek lewat **hard skip rules**
5. hanya entry jika setup lolos dan **conviction >= 70**

Tujuannya sederhana:
**lebih sedikit trade, tapi kualitas entry lebih tinggi.**
