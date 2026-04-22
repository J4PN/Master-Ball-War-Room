# Pokemon Champions Damage Calculator

Static site with:
- damage calc
- speed calc
- teambuilder
- Champions-style SP sliders
- legal ability dropdowns per Pokemon
- local hooks for legal items and custom movepools


## Legal Item List

To lock the item dropdown to your legal item pool, add a file named:

`Items.txt`

Put one item per line, for example:

```txt
Focus Sash
Choice Scarf
Leftovers
Black Belt
Sharp Beak
```

## Custom Learnset File

The app currently looks for:

`movepool.json`

Supported shapes:

```json
{
  "Pikachu": ["Volt Tackle", "Fake Out", "Thunderbolt"]
}
```

or

```json
[
  { "name": "Pikachu", "moves": ["Volt Tackle", "Fake Out", "Thunderbolt"] }
]
```
