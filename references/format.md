# Backtest Log Format

Each line in the backtest log uses:

```txt
timestamp | title | odds/current | volume | liquidity | prediction | confidence | result | note_or_url
```

## Result values

- `PENDING`
- `CORRECT`
- `WRONG`

## Summary

Win rate is calculated from records with result `CORRECT` or `WRONG` only.
