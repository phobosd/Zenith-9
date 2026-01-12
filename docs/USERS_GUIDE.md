# Ouroboro User's Guide

Welcome to Ouroboro, a cyberpunk text-based RPG. This guide will help you navigate the dark, neon-lit streets, manage your inventory, and survive combat.

## Table of Contents
1. [Basic Commands](#basic-commands)
2. [Interaction & Exploration](#interaction--exploration)
3. [Combat System](#combat-system)
4. [Shops & Terminals](#shops--terminals)
5. [Skills & Progression](#skills--progression)
6. [Cyberspace](#cyberspace)

## Basic Commands

| Command | Alias | Description | Example |
| :--- | :--- | :--- | :--- |
| `help` | `?` | List all available commands. | `help` |
| `look` | `l` | Look at the room, an item, or an NPC. | `look`, `look rat` |
| `inventory` | `i` | Check your inventory. | `i` |
| `sheet` | `stats` | View your character attributes and equipment. | `sheet` |
| `score` | `skills` | View your character skills. | `score` |
| `map` | `m` | Display the world map. | `map` |
| `weather` | `sky` | Scan the sky for current weather conditions. | `weather` |

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
*   **Wear**: Equip clothing or armor. Items automatically go to the correct slot (Head, Torso, Legs, Feet, Hands, Waist, Back).
    *   `wear <item name>` (e.g., `wear combat boots`)
*   **Remove**: Unequip an item.
    *   `remove <item name>` (e.g., `remove helmet`)
*   **Glance**: Quickly check what you are holding in your hands.
    *   `glance`

### Stance (Physical)
Your physical stance affects your energy regeneration and combat effectiveness.
*   `stand`: Stand up (default). Required for most movement and full combat effectiveness.
*   `sit`: Sit down (regenerate energy faster). **-25% Defense Power penalty.**
*   `lie`: Lie down (sleep/rest). **-50% Defense Power penalty.**

## Combat System

Combat in Ouroboro is a high-stakes, real-time tactical experience. It combines traditional command-based interactions with a modern "Action Queuing" system for advanced maneuvers.

### 1. Attributes & Combat Stats
Your character's physical and mental capabilities directly impact your survival.

*   **Agility (AGI)**: The most critical combat stat. It determines your **Attack Power**, **Defense Power**, and your success in **Maneuvering**. Higher AGI also makes the "Sync Bar" easier to hit by widening the critical zone and slowing the cursor.
*   **Constitution (CON)**: Determines your **Max HP** and **Max Fatigue**. It also dictates how quickly you regenerate health and recover from exhaustion.
*   **Strength (STR)**: Affects your carrying capacity and weight limits (important for heavy armor and weapons).
*   **Momentum (Balance)**: A dynamic value (0-100%) representing your physical stability. High balance provides a significant bonus to both attack and defense. Missing attacks or being hit by heavy blows will reduce your balance.

### 2. Engagement Tiers (Range)
Combat occurs at specific ranges. You must be at the correct range for your weapon to be effective.

*   **Disengaged**: Outside of immediate combat.
*   **Missile**: Ideal for firearms and long-range weapons.
*   **Polearm**: Reach weapons like spears or whips.
*   **Melee**: The standard range for swords, knives, and clubs.
*   **Close Quarters**: Extreme proximity (knuckles, daggers, or grappling).

**Commands**:
*   `maneuver close`: Attempt to move one tier closer to your target.
*   `maneuver withdraw`: Attempt to move one tier further away.
*   `advance <target>`: Automatically attempt to close distance every round.
*   `retreat <target>`: Automatically attempt to withdraw every round.
*   `hangback`: Toggle a defensive mode where you automatically try to maintain your distance and prevent enemies from closing in.
*   `stop`: Cancel any automated actions (advance, retreat, hangback).
*   `flee [direction]`: Attempt to break engagement and exit the room.

### 3. Combat Stances
Your combat stance determines how you allocate your defensive focus. You have 100 "Defense Points" to distribute between three pools. Note that your **Physical Stance** (sitting/lying) can impose significant penalties to your total defense power.

*   **Evasion**: Your ability to dodge both melee and ranged attacks.
*   **Parry**: Deflecting melee strikes with your weapon. **Ineffective against firearms.**
    *   *Note: If wielding a Katana, your **Kenjutsu** skill is used for parrying.*
*   **Shield**: Using a physical or energy shield to block.

**Preset Stances**:
*   `stance offensive`: Balanced defense (33/33/34), maximum aggression.
*   `stance defensive`: Balanced defense, minimum aggression (focus on survival).
*   `stance neutral`: Balanced defense, moderate aggression.
*   **Full Specialization**: `stance evasion`, `stance parry`, or `stance shield` (allocates 100% to one pool).
    *   *Note: `stance parry` allows you to gain **Flow** passively when deflecting attacks.*
*   `stance custom <e> <p> <s>`: Manually allocate points (e.g., `stance custom 50 50 0`).
*   `stance`: Typing the command alone will display your current physical stance and defense allocation.

### 4. Traditional Combat (The Sync Bar)
When you use the `attack` command, you initiate a "Neural Sync." A bar will appear with a moving cursor.
*   **Hit**: Press `Space` or `F` when the cursor is in the zone.
*   **Critical**: Hit the center of the zone for massive damage and potential **Wounds**.
*   **Miss**: Failing to hit the zone or timing it poorly results in a miss and loss of balance.

**Targeting**:
*   `target <body_part>`: Set a specific body part to target (e.g., `target head`, `target legs`).
*   `assess`: View the current combat situation, including distances and statuses.
*   `appraise <target>`: Check an enemy's health and wound status.

### 5. Advanced Combat (Action Queuing)
For melee combat, you can "upload" a sequence of actions to your neural buffer. This allows for rapid, fluid strikes and powerful combos.

**Buffer Actions**:
*   `dash`: Closes distance to the target.
*   `slash`: A standard melee strike (1.2x damage).
*   `thrust`: A powerful, focused strike (1.5x damage).
*   `parry`: Provides a temporary +20 bonus to your Parry defense and opens an **Active Parry Window** (1.5s). Any melee attack hitting you during this window has its damage reduced and grants you **Flow**.

**Execution**:
*   `upload` (or `execute`): Executes all queued actions in sequence.

**Combos**:
*   **Triple Strike**: `slash` -> `slash` -> `slash` (2.0x damage multiplier).
*   **Riposte**: `parry` -> `slash` -> `thrust` (2.5x damage multiplier).
*   **Critical Execution**: `dash` -> `dash` -> `slash` (3.0x damage multiplier).

While executing a buffer, watch for enemy **Telegraphs** (e.g., "The enemy prepares a SLASH!").

*   **Perfect Sync**: If you `parry` a telegraphed `slash` or `thrust`, or `dash` against a telegraphed `dash`, you achieve **Perfect Sync**.
*   **Active Parry**: Using the `parry` buffer action opens a 1.5s window. If an enemy attacks during this time, you deflect the blow, reducing its severity (e.g., a Solid hit becomes Marginal) and gaining Flow.
*   **Stance Parry**: If you are in `stance parry` (100% allocation), you gain Flow passively when an enemy misses you or lands only a Marginal hit.
*   **Flow State**: Accumulating 3 Flow increases your **Max Buffer Slots** (up to 6), allowing for even longer combos.

### 6. Wounds & System Shock
Heavy hits can cause lasting damage:
*   **Wounds**: Specific body parts can be bruised, bleeding, or shattered, imposing penalties to accuracy or movement. Use `appraise <target>` to check an enemy's condition.
*   **System Shock**: Taking a crushing blow while executing a buffer can **Scramble** your sequence, turning your planned attacks into useless `stumbles`.
*   **Malware**: Certain advanced enemies (like the Turing Police) can inject malware like `REBOOT.EXE` into your buffer, forcing a system shutdown.

### 7. Specialized Gear
Not all weapons are created equal. Some offer unique tactical advantages:

*   **Smart-Guns**: Equipped with neural-link software, these weapons (like the **Smart-Pistol**) make the Sync Bar significantly easier to hit.
*   **Monofilament Weapons**: Whips and wires that ignore physical armor, dealing massive damage but requiring high skill to control.
*   **Non-Lethal Options**: The **Taser Prod** and **Compliance Derm** can stun or paralyze targets, allowing for non-lethal takedowns.
*   **Heavy Kinetic**: Weapons like the **Street-Sweeper** deal devastating damage but are difficult to sync due to high recoil (jitter).
*   **Katanas**: Require the **Kenjutsu** skill for maximum effectiveness, including parrying.

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
    *   *Kenjutsu*: Mastery of the Samurai Sword. Used for attacking and parrying with Katanas.
    *   *Melee Combat*: General skill for blunt and edged weapons.
    *   *Marksmanship (Light)*: Pistols and SMGs.
    *   *Marksmanship (Medium)*: Rifles and carbines.
    *   *Marksmanship (Heavy)*: Heavy weapons and launchers.
    *   *Stealth*: Helps you avoid detection.
    *   *Hacking*: Used for data terminals and cyber-warfare.

Type `score` to see your current skill levels.

## Cyberspace

Access the Matrix to interact with digital systems.

*   `jack_in`: Connect to the Matrix (requires a Cyberdeck).
*   `jack_out`: Disconnect from the Matrix.
