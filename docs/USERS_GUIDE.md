# Ouroboro User's Guide

Welcome to Ouroboro, a cyberpunk text-based RPG. This guide will help you navigate the dark, neon-lit streets, manage your inventory, and survive combat.

## Table of Contents
1. [Basic Commands](#basic-commands)
2. [Interaction & Exploration](#interaction--exploration)
3. [Combat System](#combat-system)
4. [Shops & Terminals](#shops--terminals)
5. [Skills & Progression](#skills--progression)

## Basic Commands

| Command | Alias | Description | Example |
| :--- | :--- | :--- | :--- |
| `help` | `?` | List all available commands. | `help` |
| `look` | `l` | Look at the room, an item, or an NPC. | `look`, `look rat` |
| `inventory` | `i` | Check your inventory. | `i` |
| `sheet` | `stats` | View your character attributes. | `sheet` |
| `score` | `skills` | View your character skills. | `score` |

## Interaction & Exploration

### Movement
Navigate the world using cardinal directions: `north` (`n`), `south` (`s`), `east` (`e`), `west` (`w`).

### Items
*   **Get**: Pick up an item from the ground.
    *   `get <item name>` (e.g., `get medkit`)
*   **Drop**: Drop an item from your inventory.
    *   `drop <item name>` (e.g., `drop empty can`)
*   **Stow**: Put an item from your hands into your backpack or other containers.
    *   `stow <item name>` (e.g., `stow pistol`)
*   **Swap**: Switch items between your left and right hands.
    *   `swap`

### Stance
Your stance affects your combat and movement.
*   `stand`: Stand up (default).
*   `sit`: Sit down (regenerate energy faster).
*   `lie`: Lie down (sleep/rest).

## Combat System

Combat in Ouroboro is real-time but command-based.

*   **Attack**: Engage a target.
    *   `attack <target>` (e.g., `attack rat`)
*   **Weapons**: You need a weapon equipped in your hand to deal significant damage.
*   **Ammo**: Ranged weapons require specific magazines (e.g., `9mm Mag`). Ensure you have a loaded magazine in your inventory.

## Shops & Terminals

Shops are automated via **Terminals**.

1.  **Find a Shop**: Look for descriptions like "Chrome & Steel" or "The Armory".
2.  **Inspect Terminal**: Type `look terminal` to see the terminal description.
3.  **Browse Catalog**: Type `read terminal` (or `scan terminal`) to view the items for sale.
4.  **Purchase**: Click on the item in the terminal list (if using the mouse) or follow the on-screen prompts.

## Skills & Progression

Your character is defined by **Attributes** (STR, AGI, CON, CHA) and **Skills**.

*   **Attributes**: Fixed stats that determine your base capabilities.
*   **Skills**: Improve with use.
    *   *Marksmanship*: Improves accuracy with guns.
    *   *Stealth*: Helps you avoid detection.
    *   *Hacking*: Used for data terminals and cyber-warfare.

Type `score` to see your current skill levels.
