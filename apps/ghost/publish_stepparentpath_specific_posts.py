#!/usr/bin/env python3
"""Publish ten specific educational posts into the live Step Parent Path Ghost DB.

This script is idempotent by slug:
- if a post slug does not exist, it inserts it
- if a post slug already exists, it updates the content, metadata, and tags
"""

from __future__ import annotations

import datetime as dt
import html
import json
import re
import subprocess
import sys
import textwrap
import uuid
from html.parser import HTMLParser


DB_CONTAINER = "ghost_migrated-ghostdb-1"
DB_NAME = "ghosttipi"
DB_USER = "tipi"
DB_PASSWORD = "d8d968a0316182b184db"
AUTHOR_ID = "690ea54f05720a0001287846"
NEWSLETTER_ID = "675c9f552995960001a0f19f"
SITE_TITLE = "Step Parent Path"

TAG_IDS = {
    "blended-marriage": "8e8ca32d915f9198cf808839",
    "co-parenting": "384512810bd560469a3fcb2d",
    "forgiveness": "32ce83e43409839de2cb5b49",
    "practical-tools": "027f4a190d81fec4b4265898",
    "stepparenting": "906773235e10ba40368cec9e",
}


class PlaintextExtractor(HTMLParser):
    BLOCK_TAGS = {
        "p",
        "div",
        "section",
        "article",
        "header",
        "footer",
        "aside",
        "ul",
        "ol",
        "li",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "blockquote",
        "br",
    }

    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:  # type: ignore[override]
        if tag in {"li"}:
            self.parts.append(" - ")
        elif tag in self.BLOCK_TAGS:
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:  # type: ignore[override]
        if tag in self.BLOCK_TAGS:
            self.parts.append("\n")

    def handle_data(self, data: str) -> None:  # type: ignore[override]
        self.parts.append(data)

    def get_text(self) -> str:
        text = "".join(self.parts)
        text = html.unescape(text)
        text = re.sub(r"[ \t]+\n", "\n", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        text = re.sub(r"[ \t]{2,}", " ", text)
        return text.strip()


def dedent_html(value: str) -> str:
    return textwrap.dedent(value).strip() + "\n"


POSTS = [
    {
        "title": "The First Fifteen Minutes: How to Receive a Child Without Adding Pressure",
        "slug": "the-first-fifteen-minutes",
        "excerpt": "The transition into the house often decides the tone of the whole evening. Here is how to lower pressure in the first fifteen minutes.",
        "meta_description": "A specific blended-family plan for the first fifteen minutes after a child comes home, so the evening starts with steadiness instead of pressure.",
        "tags": ["stepparenting", "practical-tools"],
        "html": dedent_html(
            """
            <p>The first fifteen minutes after a child walks through the door matter more than many adults realize. In a blended family, that arrival moment can feel loaded before anyone says a word.</p>
            <p>A child may be coming from school, from practice, or from the other home. They may be hungry, overstimulated, sad, relieved, or braced for questions. If the adults treat those first minutes like a performance review, the whole house can tighten.</p>
            <p>What helps is a simple shift: think of the first fifteen minutes as a landing strip, not a checkpoint.</p>
            <h3>What usually makes the transition worse</h3>
            <ul>
                <li>Too many questions too quickly</li>
                <li>Immediate correction about tone, shoes, bags, or manners</li>
                <li>Pressure to hug, talk, or act happy right away</li>
                <li>Using the first minute home to discuss the other household</li>
                <li>Reading a tired face as rejection</li>
            </ul>
            <p>None of those choices are malicious. Most adults are simply anxious. They want connection. They want order. They want reassurance that the evening will go well. But when adult anxiety runs the arrival, children feel it.</p>
            <h3>A better first-fifteen-minutes plan</h3>
            <p><strong>Minute 1-3: Make the welcome simple.</strong><br>Try a low-pressure greeting: "Hey, glad you're here." That is enough. No quiz. No emotional demand. No need to extract closeness on contact.</p>
            <p><strong>Minute 3-7: Meet the body before the conversation.</strong><br>Offer water, a snack, or a few quiet minutes. Many hard evenings begin because the adults expect emotional regulation from a hungry or overstimulated child.</p>
            <p><strong>Minute 7-10: Give a brief orientation.</strong><br>Keep it practical: "Dinner is at six." "You have fifteen minutes before we head out." Clear structure helps the nervous system settle.</p>
            <p><strong>Minute 10-15: Let connection happen sideways.</strong><br>Sit nearby. Fold laundry. Start vegetables. Ask one light question if the child seems open. The goal is not to force bonding. The goal is to make the room feel safe enough for bonding to happen on its own timeline.</p>
            <h3>What a step-parent can say</h3>
            <ul>
                <li>"Hey, good to see you."</li>
                <li>"There's fruit on the counter if you want something."</li>
                <li>"You don't have to talk yet. Just settle in."</li>
                <li>"We're eating in about twenty minutes."</li>
            </ul>
            <p>Notice how none of those lines ask the child to prove warmth. They lower pressure while still keeping the home structured.</p>
            <h3>What the biological parent can do that helps</h3>
            <p>If the child is especially tense on arrival, the biological parent should take the emotional lead early. Not because the step-parent is less important, but because familiarity lowers threat. A simple handoff between adults can help: the biological parent does the first reconnection, and the step-parent joins once the room has softened.</p>
            <p>That is not exclusion. It is pacing.</p>
            <h3>If the child comes in rude or shut down</h3>
            <p>Do not ignore disrespect forever, but do not assume the first ten seconds are the right time to address it. A better sequence is:</p>
            <ul>
                <li>steady the room first</li>
                <li>meet practical needs</li>
                <li>address tone later, when everyone is more regulated</li>
            </ul>
            <p>You can say, "You seem wound up. Go get settled and we'll reconnect in a few minutes." That protects both dignity and structure.</p>
            <h3>The deeper principle</h3>
            <p>A child should not have to earn safe entry into the home by being instantly pleasant. The adults set the emotional climate. If the entry point becomes calmer, the rest of the evening often follows.</p>
            <p>The first fifteen minutes do not have to be perfect. They just need to say: you are safe here, there is room to arrive as you are, and this house does not need instant performance from you in order to stay steady.</p>
            """
        ),
    },
    {
        "title": "Dinner Table Silence: What to Do When a Stepchild Ignores You",
        "slug": "dinner-table-silence-stepchild-ignores-you",
        "excerpt": "A cold dinner table can hurt. Here is how to respond when a stepchild ignores you without turning one awkward meal into a larger rupture.",
        "meta_description": "What step-parents can do when a child ignores them at dinner, including what to say, what not to force, and how to keep the meal from turning into a power fight.",
        "tags": ["stepparenting", "practical-tools"],
        "html": dedent_html(
            """
            <p>Few moments feel more personal to a step-parent than being ignored at the dinner table. You ask a normal question. The child answers everyone else but not you. Or they look down, go silent, and leave you sitting there with your own embarrassment.</p>
            <p>Because meals are supposed to feel communal, silence at the table can land like rejection. Many adults respond to that sting in one of two ways: they press for connection harder, or they shut down completely. Both responses usually make the table less safe.</p>
            <p>A better goal is not to win the moment. It is to keep the table from turning into another place where everybody braces.</p>
            <h3>First, interpret the moment carefully</h3>
            <p>A child ignoring you at dinner might be sending a message, but the message is not always hatred. It could be loyalty tension. It could be fatigue. It could be social discomfort. It could be resentment from something that happened earlier. It could be their clumsy way of keeping emotional distance.</p>
            <p>You do not help the situation by deciding too quickly what the silence "means."</p>
            <h3>What not to do at the table</h3>
            <ul>
                <li>Do not say, "Wow, nice to know I don't matter."</li>
                <li>Do not ask your partner to force a response in the moment.</li>
                <li>Do not start a lecture about manners in front of everyone.</li>
                <li>Do not compete with the biological parent for warmth.</li>
                <li>Do not withdraw in a way that changes the whole room temperature.</li>
            </ul>
            <p>All of those reactions are understandable. None of them make the next dinner easier.</p>
            <h3>What helps instead</h3>
            <p><strong>Keep your question light.</strong><br>If you asked something and got nothing, do not chase. Let the silence pass. Move the conversation on. The step-parent who can survive one awkward beat without escalating sends an important message: this home is not fragile.</p>
            <p><strong>Stay warm, but stop pressing.</strong><br>You do not need to become icy. You also do not need to keep trying to win the child back during the same meal.</p>
            <p><strong>Let the biological parent carry the table if needed.</strong><br>If the atmosphere is brittle, it may help for the biological parent to carry more of the conversation that night. That is pacing, not surrender.</p>
            <h3>A useful private follow-up later</h3>
            <p>If the pattern repeats, address it outside the meal. A calm line works better than a wounded speech:</p>
            <p>"I noticed dinner felt a little shut down between us. I am not going to force conversation, but I do want the table to stay respectful. If something is off, we can talk about it later."</p>
            <p>That sentence does three things:</p>
            <ul>
                <li>it names the pattern</li>
                <li>it keeps the boundary</li>
                <li>it lowers the emotional charge</li>
            </ul>
            <h3>When the biological parent should step in</h3>
            <p>If a child is openly rude to the step-parent at meals, the biological parent should help restore the norm. Not with public humiliation, but with calm clarity: "You do not have to be chatty, but you do need to be respectful."</p>
            <p>That matters. A step-parent feels safer when their partner protects the tone of the room.</p>
            <h3>Make the table easier, not more performative</h3>
            <p>Some children do better when dinner is not treated like a forced intimacy zone. Side-by-side rituals can help:</p>
            <ul>
                <li>one simple high-low question for everyone</li>
                <li>letting conversation be shorter on transition days</li>
                <li>giving the child one small job like serving water</li>
                <li>ending before the table becomes emotionally overloaded</li>
            </ul>
            <p>Belonging grows faster in a room that asks for simple participation before emotional openness.</p>
            <h3>The deeper work</h3>
            <p>When you are ignored, the temptation is to protect yourself by becoming hard. But hardening usually confirms to the child that the relationship is unsafe. A steadier path is this: do not excuse disrespect, do not personalize every silence, and do not turn one awkward dinner into a verdict on the whole bond.</p>
            <p>Dinner table trust is built one ordinary evening at a time. The mature move is often the quiet one: keep the table steady tonight, then deal with the relationship in a calmer room tomorrow.</p>
            """
        ),
    },
    {
        "title": "Screen-Time Across Two Homes: Rules Without a Loyalty War",
        "slug": "screen-time-across-two-homes",
        "excerpt": "Screen limits get messy fast in blended families. Here is how to create structure without turning devices into another loyalty fight.",
        "meta_description": "A practical guide to screen-time rules across two homes, including what each household can control and how to stop devices from becoming a loyalty battle.",
        "tags": ["co-parenting", "practical-tools"],
        "html": dedent_html(
            """
            <p>Screen-time conflicts in blended families are rarely just about screens. They are usually about control, fairness, comparison, and the fear that the other house is "winning" because it looks easier.</p>
            <p>One home has strict limits. The other has almost none. One parent wants structure. Another wants peace. A step-parent sees the fallout and starts pushing harder. Before long, the device is not a tool anymore. It is a symbol.</p>
            <p>The goal is not identical rules in both homes. That is often unrealistic. The goal is a plan that protects your household without turning children into referees between adult standards.</p>
            <h3>Start with the one principle that matters</h3>
            <p>You can control the culture of your home. You usually cannot control the culture of the other home. Confusing those two realities creates endless frustration.</p>
            <p>That means the first question is not, "How do we make the other house do this?" The first question is, "What rule can we consistently hold here without turning every evening into a fight?"</p>
            <h3>Build your rule around three categories</h3>
            <p><strong>1. Non-negotiables.</strong><br>These are the limits tied to safety, sleep, school, or family functioning. Example: no devices in bedrooms after 9:00 p.m.</p>
            <p><strong>2. Flex rules.</strong><br>These are the rules that may shift for travel, illness, special events, or transition days.</p>
            <p><strong>3. Preferences.</strong><br>These are not worth turning into a full power struggle. If you treat every preference like a principle, the child stops hearing you.</p>
            <h3>What to say instead of comparing homes</h3>
            <p>Do not say:</p>
            <ul>
                <li>"Your mom lets you do whatever you want."</li>
                <li>"Well, at dad's house you can be lazy, but not here."</li>
                <li>"The other house is the reason you are like this."</li>
            </ul>
            <p>Those lines make the child defend the other home, even if they privately agree with you.</p>
            <p>Try:</p>
            <ul>
                <li>"Different houses make different choices. This is how we do evenings here."</li>
                <li>"We are protecting sleep and school, not punishing you."</li>
                <li>"You do not have to agree with the rule to follow it."</li>
            </ul>
            <h3>Keep the biological parent in the lead when the rule is new</h3>
            <p>If screen-time has been chaotic, the biological parent should usually introduce the first reset. A step-parent can support, but if the step-parent is the visible face of the new limit, the child may experience the rule as relational threat instead of household structure.</p>
            <h3>What helps rules hold</h3>
            <ul>
                <li>post the expectation in writing</li>
                <li>tie screen access to predictable times, not adult mood</li>
                <li>give warnings before transition points</li>
                <li>have a charging station outside bedrooms</li>
                <li>pair screen limits with a viable alternative, not just empty space</li>
            </ul>
            <p>The phrase "screens off" lands differently when there is already a plan for snack, a short walk, a game, or downtime before bed.</p>
            <h3>If the other home undercuts the rule</h3>
            <p>Stay out of moral theater. Children do not need to hear adults attack each other's standards. Hold the line in your own home, document what matters if safety is involved, and avoid using the child as the carrier pigeon for your frustration.</p>
            <p>If co-parent communication is possible, keep it plain: "We are trying to support consistent sleep, so we are limiting devices after 9:00. Sharing in case it helps coordination."</p>
            <p>No accusation. No hidden jab.</p>
            <h3>The deeper issue</h3>
            <p>Screen fights often expose something else: the family has not agreed on who leads, what the house protects, and how conflict gets handled when the child dislikes the answer.</p>
            <p>If you can solve those questions, screens become simpler. Not easy, but simpler.</p>
            <p>A good blended-family screen plan is not perfect or identical across homes. It is clear, repeatable, and calm enough that the child does not have to pick a side in order to survive it.</p>
            """
        ),
    },
    {
        "title": "Public Corrections: What to Do When Your Partner Undercuts You in Front of the Kids",
        "slug": "partner-undercuts-you-in-front-of-the-kids",
        "excerpt": "Few things destabilize a step-parent faster than being corrected in front of the children. Here is how to repair the moment and protect the couple bond.",
        "meta_description": "A practical plan for when one partner corrects the other in front of the children, including what to do in the moment and what to repair later.",
        "tags": ["blended-marriage", "practical-tools"],
        "html": dedent_html(
            """
            <p>When your partner corrects you in front of the kids, the pain is usually bigger than the sentence itself. The issue is not only the disagreement. It is the loss of footing.</p>
            <p>One moment you are trying to lead a room. The next moment your partner is visibly siding away from you. The children feel it. You feel it. And now the whole house is watching the couple bond wobble.</p>
            <p>Because the moment is public, many adults make one of two moves: they fight back immediately, or they go silent and store resentment for later. Both approaches tend to damage trust.</p>
            <h3>What to do in the exact moment</h3>
            <p><strong>Do not make the children watch a marriage debate.</strong><br>If you can, keep your response short and regulated. A line like, "Let's come back to that," protects the room better than trying to defend every detail in real time.</p>
            <p><strong>Do not surrender the whole structure either.</strong><br>If the issue is immediate and practical, you can keep things moving without escalating. Example: "Okay, let's pause the consequence and you and I will talk after dinner."</p>
            <p>This matters because children do not need to watch adults compete for authority. They need to see that tension can be contained.</p>
            <h3>What not to say</h3>
            <ul>
                <li>"Why are you always doing this to me?"</li>
                <li>"Fine, you handle everything then."</li>
                <li>"See? This is why the kids don't respect me."</li>
            </ul>
            <p>Those lines may feel true. They also widen the crack in the exact moment it needs to be held.</p>
            <h3>Have the private conversation quickly</h3>
            <p>Do not let this sit for three days. The longer it waits, the more your mind turns one moment into a whole pattern, whether or not that pattern is fully real.</p>
            <p>A good private opening sounds like this:</p>
            <p>"I want to talk about what happened in front of the kids. I can handle disagreement, but I need us to have a plan for how we do that without pulling the floor out from under each other."</p>
            <p>That line focuses on process, not accusation.</p>
            <h3>Questions that help the couple get somewhere useful</h3>
            <ul>
                <li>What were you worried about in that moment?</li>
                <li>What did I miss or mishandle?</li>
                <li>How could you have signaled concern without correcting me publicly?</li>
                <li>What is our rule for disagreement in front of the children going forward?</li>
            </ul>
            <h3>Create a couple agreement</h3>
            <p>Most blended couples need an actual agreement here, not just a vague hope.</p>
            <p>A workable agreement often sounds like this:</p>
            <ul>
                <li>if one of us sees a problem, we interrupt softly, not sharply</li>
                <li>if the issue is not urgent, we circle back privately</li>
                <li>the biological parent takes the lead if the child is already dysregulated</li>
                <li>we do not use the child as the audience for our disagreement</li>
            </ul>
            <p>That agreement does not erase conflict. It gives conflict a safer container.</p>
            <h3>If you were the partner who did the public correction</h3>
            <p>Repair it plainly. "I should not have corrected you that way in front of the kids. If I had a concern, I needed to bring it to you more privately." That sentence restores trust faster than a defensive explanation.</p>
            <h3>If the children saw the whole thing</h3>
            <p>You do not need a dramatic family statement. A brief reset is enough: "We did not handle that well as adults. We talked it through, and we are going to do it better next time." Children feel safer when adults can acknowledge a rupture without turning it into theater.</p>
            <h3>The deeper issue</h3>
            <p>Public corrections hurt because they make the family feel less led. Stepfamilies need adult unity, but unity should feel like shelter, not a power bloc and not a silent truce.</p>
            <p>The healthiest couples are not the ones who never disagree in front of children. They are the ones who know how to contain disagreement, repair it fast, and come back to the room with steadier alignment than before.</p>
            """
        ),
    },
    {
        "title": "\"You're Not My Real Parent\": How to Respond Without Making It Worse",
        "slug": "you-are-not-my-real-parent-how-to-respond",
        "excerpt": "When a child throws this line, the step-parent's reaction often decides whether the moment becomes a rupture or a doorway into a better boundary.",
        "meta_description": "What step-parents can say when a child says 'you're not my real parent,' including how to stay steady, keep a boundary, and avoid turning the line into a larger wound.",
        "tags": ["stepparenting", "forgiveness"],
        "html": dedent_html(
            """
            <p>Few sentences hit a step-parent harder than, "You're not my real parent." The line lands on identity, effort, and belonging all at once. That is why so many adults either snap back or collapse inside when they hear it.</p>
            <p>But the line usually tells you more about the child's stress than about your worth. It often comes out during conflict, correction, transition, or divided loyalty. The child is not delivering a careful position paper. They are reaching for the sharpest tool they can find.</p>
            <p>Your job is not to pretend the line is harmless. Your job is to keep it from becoming the center of the entire relationship.</p>
            <h3>What not to do</h3>
            <ul>
                <li>Do not argue the title in the moment.</li>
                <li>Do not say, "After all I do for you..."</li>
                <li>Do not demand gratitude.</li>
                <li>Do not force the child to reassure you emotionally.</li>
                <li>Do not make a global statement like, "Then I guess I just won't care anymore."</li>
            </ul>
            <p>All of those reactions tell the child that the adult's pain is now the emergency they must manage. That is too much weight.</p>
            <h3>A steadier response</h3>
            <p>You can answer the line without agreeing with disrespect. Try something like:</p>
            <ul>
                <li>"You're right that I'm not your biological parent. I am still one of the adults responsible for this home, and I'm going to speak to you respectfully and expect the same back."</li>
                <li>"You do not have to call me a parent to speak respectfully."</li>
                <li>"We can be clear about roles without being hurtful."</li>
            </ul>
            <p>Those lines do three important things: they stay grounded in truth, they keep the boundary, and they refuse the power struggle.</p>
            <h3>Let the biological parent help carry the aftermath</h3>
            <p>After a moment like this, the biological parent should not disappear. If the child is dysregulated, the biological parent can step in and reinforce tone: "You may be upset, but you do not speak to them that way."</p>
            <p>This is not about forcing the child to feel emotionally close to the step-parent. It is about protecting respect inside the home.</p>
            <h3>What to do with your own hurt</h3>
            <p>The line can bring up every quiet insecurity a step-parent already carries. Am I outside? Am I pretending? Am I only tolerated? Because the questions run deep, it helps to separate the moment from the story you start telling about it.</p>
            <p>The moment may mean the child is angry. It does not automatically mean the relationship is fake or doomed.</p>
            <h3>Have a calmer follow-up later</h3>
            <p>If the child is old enough and the relationship can hold it, a later conversation may help:</p>
            <p>"I am not asking you to feel something you do not feel. I am asking that we treat each other with respect. We can have a real relationship at your pace, but we cannot build it through lines that are meant to wound."</p>
            <p>That kind of conversation protects both truth and dignity.</p>
            <h3>What this moment is really about</h3>
            <p>In many homes, "You're not my real parent" is the child's shortcut for saying one of these things:</p>
            <ul>
                <li>I feel controlled.</li>
                <li>I miss my other parent.</li>
                <li>I do not know what your role is.</li>
                <li>I need distance right now.</li>
                <li>I want someone familiar to handle this moment.</li>
            </ul>
            <p>You do not excuse the hurtful line by seeing the deeper need. But you become wiser in how you respond.</p>
            <h3>The deeper principle</h3>
            <p>Belonging in a stepfamily cannot be argued into existence. It is built slowly. That means a step-parent often has to hold two truths at once: I do not need to deny reality, and I do not need to let this sentence define the entire relationship.</p>
            <p>A steady answer says, in effect: I know who I am, I know what this home requires, and I am not going to make this moment worse by needing a title in order to keep my center.</p>
            """
        ),
    },
    {
        "title": "Chores Without Power Struggles: A Better Way to Introduce Responsibility",
        "slug": "chores-without-power-struggles",
        "excerpt": "Chores get explosive in blended families when responsibility is introduced as control instead of belonging. Here is a calmer way to do it.",
        "meta_description": "A practical blended-family guide to introducing chores without triggering 'you're not my parent' fights, resentment, or unclear roles.",
        "tags": ["stepparenting", "practical-tools"],
        "html": dedent_html(
            """
            <p>Chores are simple on paper and surprisingly emotional in blended families. The task itself is rarely the real issue. The issue is what the task seems to represent.</p>
            <p>To the adult, loading the dishwasher may mean shared responsibility. To the child, it may feel like one more outsider telling them what to do. To the biological parent, it may stir guilt. To the step-parent, resistance may feel like disrespect or rejection.</p>
            <p>That is why chore fights often get bigger than they should.</p>
            <h3>The mistake many adults make</h3>
            <p>They introduce chores in the middle of resentment. The child is already unsure of the step-parent's role, the couple has not fully aligned, and then someone suddenly says, "You need to start doing your share around here."</p>
            <p>The child does not hear household responsibility. They hear a power move.</p>
            <h3>Start with the meaning of chores</h3>
            <p>In a blended family, chores work best when they are framed as participation in the household, not proof of obedience to a particular adult.</p>
            <p>Try language like:</p>
            <ul>
                <li>"Everybody in this house helps keep it going."</li>
                <li>"These are family jobs, not punishments."</li>
                <li>"We are trying to make the home work for everyone."</li>
            </ul>
            <p>That language is steadier than, "Because I said so," especially early in a stepfamily.</p>
            <h3>Let the biological parent introduce the first version</h3>
            <p>This is one of the clearest places where pacing matters. If the step-parent is the first and strongest voice around chores, the child may merge the task with the relationship threat. When the biological parent introduces the initial system, the family gets structure with less defensiveness.</p>
            <h3>Use fewer chores, not more</h3>
            <p>Adults often overload the launch. Better to start with one or two repeatable responsibilities than with a long list no one can sustain.</p>
            <p>Good first chores are:</p>
            <ul>
                <li>take your dish to the sink</li>
                <li>put shoes and bag in the right place</li>
                <li>help clear the table</li>
                <li>put laundry in one designated basket</li>
            </ul>
            <p>These are less likely to feel like a regime change.</p>
            <h3>Make the system visible</h3>
            <p>A small written chart helps. Not because children cannot remember, but because written expectations feel less personal than verbal correction in the heat of the moment. The chart also keeps adults consistent.</p>
            <h3>What a step-parent can say</h3>
            <p>When a task is missed, use clean language:</p>
            <ul>
                <li>"Your dish still needs to go to the sink."</li>
                <li>"This is one of the jobs everyone does here."</li>
                <li>"If you want help getting started, I can help you do the first step."</li>
            </ul>
            <p>Notice the tone. Clear, not sharp. Steady, not wounded.</p>
            <h3>If the child says, "You can't tell me what to do"</h3>
            <p>Do not debate authority in the middle of the chore. That usually becomes more about role than about responsibility. A better answer is: "We can talk about roles later. Right now, the job still needs to get done." If needed, the biological parent reinforces it.</p>
            <h3>Do not tie chores to emotional acceptance</h3>
            <p>A step-parent should not make chore compliance the test for whether the relationship is "working." Children can resist tasks for a hundred reasons. Keep the boundary, but do not load the task with all your emotional meaning.</p>
            <h3>What helps chores stick</h3>
            <ul>
                <li>predictable timing</li>
                <li>small tasks first</li>
                <li>adult follow-through without long speeches</li>
                <li>clear consequences that are not humiliating</li>
                <li>genuine appreciation when the child contributes</li>
            </ul>
            <p>Appreciation matters. Not in a manipulative way, but in a house-building way. "Thanks for taking care of that" helps chores feel connected to belonging rather than constant correction.</p>
            <h3>The deeper principle</h3>
            <p>Responsibility grows faster in a home where the child does not feel like household contribution is just another test they are failing. Chores should teach participation, not resentment.</p>
            <p>When adults pace the system, stay aligned, and refuse to turn every missed task into a role argument, chores become what they are supposed to be: one ordinary way people help make a home livable for each other.</p>
            """
        ),
    },
    {
        "title": "School Events and Exes: A Stepparent Plan Before You Walk In",
        "slug": "school-events-and-exes-step-parent-plan",
        "excerpt": "Concerts, games, and school nights can go sideways fast if the adults do not plan ahead. Here is a practical approach that protects the child and lowers strain.",
        "meta_description": "A practical plan for school events in blended families, including seating, greetings, partner alignment, and how to keep the child out of adult tension.",
        "tags": ["co-parenting", "blended-marriage"],
        "html": dedent_html(
            """
            <p>School events look simple from the outside. You show up, support the child, clap, smile, go home. In a blended family, they can feel like walking into an emotional minefield.</p>
            <p>Where do you sit? Who greets whom? What if the ex is cold? What if the child looks torn? What if your partner expects you to act like one big team and you know that is not reality?</p>
            <p>The event itself is usually not the hardest part. The lack of a plan is.</p>
            <h3>Have the conversation before you leave the house</h3>
            <p>Do not improvise this in the parking lot. A good pre-event conversation between partners covers:</p>
            <ul>
                <li>where you are likely to sit</li>
                <li>how greetings will work</li>
                <li>whether you are attending together or arriving separately</li>
                <li>what to do if the other parent becomes tense or provocative</li>
                <li>how you will keep the child from feeling responsible for adult awkwardness</li>
            </ul>
            <p>This is not overthinking. It is containment.</p>
            <h3>Pick a child-centered goal</h3>
            <p>The goal is not to look perfect. The goal is not to prove who belongs more. The goal is for the child to experience support with as little adult static as possible.</p>
            <p>That goal alone clarifies many decisions.</p>
            <h3>Choose a greeting style ahead of time</h3>
            <p>You do not have to force warm interaction with an ex in order to be mature. Most school events go better when greetings are brief, courteous, and low-pressure.</p>
            <p>Examples:</p>
            <ul>
                <li>"Hi, good to see you."</li>
                <li>"We're glad to be here."</li>
                <li>"Let's make sure she sees us after."</li>
            </ul>
            <p>Short, respectful, and clean is often enough.</p>
            <h3>Decide where the step-parent fits</h3>
            <p>There is no universal answer. Sometimes the step-parent sits with the couple. Sometimes the seating is looser. Sometimes separate seating lowers pressure on the child. The question is not what looks most legitimate. The question is what best protects the atmosphere.</p>
            <p>If the child is already anxious about divided loyalties, less performative togetherness is often kinder than forced unity.</p>
            <h3>What to do if the ex is cold or difficult</h3>
            <p>Do not recruit the child into emotional interpretation. Do not whisper commentary from the bleachers. Do not use the event to settle old pain.</p>
            <p>Stay brief. Stay courteous. Stay on purpose. Your self-control may be one of the most protective things you offer the child that night.</p>
            <h3>Have an exit plan</h3>
            <p>After the event, many adults make the mistake of lingering in uncertainty. Decide beforehand:</p>
            <ul>
                <li>who approaches the child first</li>
                <li>whether photos make sense</li>
                <li>how long you will stay</li>
                <li>what you will do if the moment becomes crowded or tense</li>
            </ul>
            <p>A simple plan prevents awkward hovering.</p>
            <h3>A note for step-parents specifically</h3>
            <p>School events can stir questions of legitimacy. Am I supposed to stand back? Am I intruding? Am I invisible? Those questions are real, but the event is usually not the place to answer them. The event is for showing up cleanly, kindly, and without making the child carry your uncertainty.</p>
            <p>Your deeper questions belong with your partner later, in private.</p>
            <h3>Debrief after, not during</h3>
            <p>Once you are home, talk with your partner. What worked? What felt strained? What would make the next event easier on the child and on your relationship? Families that learn in small cycles handle these public moments better over time.</p>
            <h3>The deeper principle</h3>
            <p>A successful school event is not one where every adult feels perfectly comfortable. It is one where the child gets to enjoy the moment without managing the emotional weather of the adults around them.</p>
            <p>If you can walk in with a plan, stay in your lane, and keep the atmosphere clean, you have already done more for the child than a flawless photo could ever show.</p>
            """
        ),
    },
    {
        "title": "The Shared Calendar: How to Reduce Conflict Before the Week Starts",
        "slug": "shared-calendar-reduces-conflict",
        "excerpt": "Many blended-family arguments are really planning failures in disguise. A shared calendar can remove pressure before it becomes resentment.",
        "meta_description": "How blended families can use a shared calendar to lower conflict around custody, school, activities, chores, and couple time before the week begins.",
        "tags": ["co-parenting", "practical-tools"],
        "html": dedent_html(
            """
            <p>A surprising number of blended-family fights are not really about disrespect, selfishness, or commitment. They are about surprise. A missed pickup. An unspoken practice. Two adults assuming different things about the same Wednesday.</p>
            <p>When the week has no clear shape, the family pays for it emotionally. The child feels the scramble. The couple turns on each other. The step-parent feels like support staff for a plan they never saw.</p>
            <p>A shared calendar will not fix every dynamic, but it can lower the friction that comes from preventable chaos.</p>
            <h3>What belongs on the calendar</h3>
            <ul>
                <li>custody transitions and handoff times</li>
                <li>school events and assignments that affect logistics</li>
                <li>sports, rehearsals, and medical appointments</li>
                <li>bedtime or routine shifts on special days</li>
                <li>couple check-ins and important household tasks</li>
            </ul>
            <p>If it changes the flow of the house, it probably belongs on the calendar.</p>
            <h3>What makes a shared calendar actually work</h3>
            <p><strong>It has one owner for updates.</strong><br>When everyone assumes someone else is keeping it current, it becomes decorative.</p>
            <p><strong>It gets reviewed weekly.</strong><br>A ten-minute Sunday check-in prevents a lot of Tuesday resentment.</p>
            <p><strong>It uses the same categories every week.</strong><br>Color-coding helps: child logistics, school, co-parent communication, household tasks, and couple time.</p>
            <p><strong>It is visible to the adults who need it.</strong><br>If one partner has all the information in their head, the calendar is not doing its job.</p>
            <h3>A simple weekly review</h3>
            <p>Try this format every Sunday night:</p>
            <ul>
                <li>What are the fixed events this week?</li>
                <li>Where are the tight transitions?</li>
                <li>Who is handling pickups, food, and bedtime on the busy days?</li>
                <li>Is there anything the child needs to be prepared for ahead of time?</li>
                <li>Where do we need extra margin as a couple?</li>
            </ul>
            <p>That last question matters more than people think. Couples in blended families do better when they stop pretending margin will appear on its own.</p>
            <h3>What not to do</h3>
            <ul>
                <li>Do not weaponize the calendar as proof that one adult cares more.</li>
                <li>Do not use the child as the primary memory system.</li>
                <li>Do not fill the calendar with every hope and preference until no one can sustain it.</li>
                <li>Do not punish someone for not reading your mind when nothing was written down.</li>
            </ul>
            <p>A calendar is a planning tool, not a courtroom exhibit.</p>
            <h3>Why step-parents often need this more than anyone</h3>
            <p>Step-parents are frequently expected to adapt to plans they did not help create. That breeds quiet resentment fast. A shared calendar gives the step-parent visibility, predictability, and a fairer way to participate in the actual running of the house.</p>
            <h3>Use the calendar to lower pressure on children too</h3>
            <p>Children feel safer when the adults look prepared. They do not have to hear every detail, but they should not live inside constant surprise. A child who knows what the week holds often behaves better simply because the world feels less shaky.</p>
            <h3>Make room for relationship care</h3>
            <p>Do not only calendar the child logistics. Put the couple check-in on there too. Ten protected minutes after a transition night may prevent a much larger argument later. If the calendar only tracks duties, the marriage will eventually feel like an operations center instead of a relationship.</p>
            <h3>The deeper principle</h3>
            <p>Many people think conflict is solved in the argument. Often it is solved earlier than that, in the plan. A shared calendar is one way of telling the family: we are going to carry the week with intention instead of letting the week carry us into resentment.</p>
            <p>It is not glamorous. It is just one of the quiet tools that helps a home feel more predictable, more respectful, and less reactive.</p>
            """
        ),
    },
    {
        "title": "After You Overreact: A Repair Process That Rebuilds Safety",
        "slug": "after-you-overreact-a-repair-process",
        "excerpt": "Every step-parent eventually has a moment they wish they could redo. Here is how to repair it in a way that actually restores trust.",
        "meta_description": "A clear repair process for step-parents after they overreact, including how to apologize, restore safety, and avoid making the child manage the adult's guilt.",
        "tags": ["forgiveness", "stepparenting"],
        "html": dedent_html(
            """
            <p>At some point, almost every step-parent has a moment they want back. You were tired. The room was loud. The disrespect felt constant. You snapped, lectured, slammed a tone into the room you do not actually want to be known for.</p>
            <p>What happens next matters. Not because one bad moment defines you, but because children learn a lot about safety from how adults recover after losing their footing.</p>
            <p>Repair is not weakness. It is one of the strongest things an adult can do in a blended family.</p>
            <h3>Step 1: regulate before you explain</h3>
            <p>Do not rush in with a complicated apology while you are still hot, shaky, or defensive. Breathe. Walk. Drink water. Let your body come back enough that the repair does not sound like a disguised argument.</p>
            <h3>Step 2: name what happened plainly</h3>
            <p>A good repair starts with ownership, not atmosphere. Try:</p>
            <p>"I raised my voice and came at you too hard earlier. That was not okay."</p>
            <p>That is stronger than vague language like, "Things got intense," because it tells the truth.</p>
            <h3>Step 3: do not make the child carry your intention</h3>
            <p>This is where many adults slip. They say, "I only did it because I care so much," or, "You know I have a lot on my plate." Both may be true. Neither belongs in the first repair sentence.</p>
            <p>In early repair, impact matters more than explanation.</p>
            <h3>Step 4: restore the boundary if one still matters</h3>
            <p>Repair does not mean erasing the original issue. If the child still needs to clean up, apologize, or change course, you can say so. But separate the issue from the overreaction:</p>
            <p>"The problem still needs attention, but I should have handled it differently."</p>
            <p>That sentence protects both accountability and safety.</p>
            <h3>Step 5: keep it human-sized</h3>
            <p>Do not turn repair into a speech about your whole character arc. Many children can only receive a short, sincere reset. A few sentences, a steadier tone, and a concrete next step often go further than an emotional monologue.</p>
            <h3>A workable repair script</h3>
            <ul>
                <li>"I overreacted."</li>
                <li>"That probably did not feel safe or fair."</li>
                <li>"I want to handle this better."</li>
                <li>"We still need to deal with the issue, but we can do it in a calmer way."</li>
            </ul>
            <h3>What the biological parent can do</h3>
            <p>If you are the step-parent and you overreacted, your partner can help by supporting repair without turning you into the family villain. A good partner response sounds like: "We are going to reset this. The issue matters, and so does the way we handle it."</p>
            <p>That protects the child and the couple at the same time.</p>
            <h3>If the child is not ready to engage</h3>
            <p>Respect that. Repair is an offer, not a forced emotional exchange. If the child says little or walks away, you can still complete your side of the work. Safety grows when adults stop demanding immediate emotional closure from children.</p>
            <h3>Repair yourself too</h3>
            <p>After the moment passes, ask better questions than "What is wrong with me?" Try:</p>
            <ul>
                <li>What was I carrying before this happened?</li>
                <li>What sign did I ignore in my own body?</li>
                <li>What support or structure would help me respond earlier next time?</li>
            </ul>
            <p>That kind of reflection turns guilt into maturity.</p>
            <h3>The deeper principle</h3>
            <p>Children do not need perfect adults. They need adults who can tell the truth after a rupture and come back less defended. A home becomes safer not because no one ever raises their voice, but because the adults do not let rupture harden into the atmosphere.</p>
            <p>Repair is one of the ways a family learns this quiet truth: we can do damage, tell the truth about it, and begin again without pretending it never happened.</p>
            """
        ),
    },
    {
        "title": "Bedtime Resistance: How to End the Day Without Another Power Fight",
        "slug": "bedtime-resistance-in-a-blended-family",
        "excerpt": "Bedtime turns into conflict fast when the whole day has been emotionally loaded. Here is how to make nights calmer and more predictable.",
        "meta_description": "A practical guide to bedtime resistance in blended families, including transitions, scripts, and how to keep the end of the day from becoming another power battle.",
        "tags": ["stepparenting", "practical-tools"],
        "html": dedent_html(
            """
            <p>Bedtime is where many blended-family tensions come home to roost. The adults are tired. The child is tired. Anything unresolved from the day is still in the air. That is why a simple request like "time to brush teeth" can suddenly become a whole relational drama.</p>
            <p>When bedtime regularly ends in power struggles, the issue is usually bigger than hygiene or lights out. The child may be dysregulated from transition, worried about separation, resisting structure, or pushing against a role that still feels unclear.</p>
            <p>The answer is not to give up the boundary. It is to make bedtime more predictable and less personal.</p>
            <h3>What makes bedtime worse</h3>
            <ul>
                <li>springing bedtime with no warning</li>
                <li>using the step-parent as the only enforcer in a tense season</li>
                <li>starting emotional conversations when the child is exhausted</li>
                <li>correcting every small thing in the last twenty minutes of the day</li>
                <li>letting screens run late and then expecting an easy shutoff</li>
            </ul>
            <p>By bedtime, even small friction can feel enormous.</p>
            <h3>Build a repeatable sequence</h3>
            <p>Children settle better when bedtime is a routine instead of a negotiation. Keep it simple and repeatable:</p>
            <ul>
                <li>ten-minute warning</li>
                <li>bathroom and teeth</li>
                <li>device docked outside the room</li>
                <li>one quiet settling activity</li>
                <li>lights-out phrase that stays the same</li>
            </ul>
            <p>The more repeatable the sequence, the less adults need to improvise while tired.</p>
            <h3>Who should lead bedtime?</h3>
            <p>In some blended families, the biological parent should carry more of bedtime early on, especially if nights are already charged. That is not because the step-parent is incapable. It is because bedtime touches vulnerability, attachment, and familiarity. The step-parent can participate, but pacing matters.</p>
            <h3>Use short scripts, not longer speeches</h3>
            <p>At bedtime, many adults talk too much. A dysregulated child does not need a lecture on respect at 9:07 p.m. They need fewer words and a steadier tone.</p>
            <p>Helpful lines:</p>
            <ul>
                <li>"It is bedtime now. I will help you with the next step."</li>
                <li>"You can be upset and still move forward."</li>
                <li>"We are not solving everything tonight. We are ending the day calmly."</li>
            </ul>
            <h3>If the child starts picking a fight</h3>
            <p>Do not take every late-night argument invitation. Many bedtime fights are bids for control or delay. Keep the boundary, reduce the words, and move toward the next step. If a real issue needs attention, write it down and address it the next day when everyone's brain is back online.</p>
            <h3>What step-parents need to watch</h3>
            <p>Because bedtime can feel like the last test of the day, step-parents often pour accumulated frustration into it. Be careful. The goal is not to make the child fully compliant before sleep. The goal is to close the day without adding fresh threat to the house.</p>
            <h3>What helps the next night go better</h3>
            <ul>
                <li>more margin before the routine starts</li>
                <li>less sugar and less screen stimulation late</li>
                <li>clearer partner alignment before the evening begins</li>
                <li>one small reassuring ritual that stays consistent</li>
            </ul>
            <p>A child who knows what happens every night often fights less because they are not also fighting uncertainty.</p>
            <h3>The deeper principle</h3>
            <p>Night should not feel like the hour when all the day's power struggles come due. In a blended family, bedtime works best when it is boring in the best possible way: predictable, contained, and not overloaded with adult emotion.</p>
            <p>Ending the day calmly is one of the most practical ways a family learns that structure can feel safe instead of sharp.</p>
            """
        ),
    },
    {
        "title": "The Car Ride Home: How to Talk After a Hard Practice, Game, or School Day",
        "slug": "the-car-ride-home-after-a-hard-day",
        "excerpt": "The drive home is one of the easiest places to accidentally overtalk or overcorrect. Here is how to use it wisely.",
        "meta_description": "A practical guide for step-parents and parents on how to handle the car ride home after a hard school day, practice, or game without turning it into an interrogation.",
        "tags": ["stepparenting", "practical-tools"],
        "html": dedent_html(
            """
            <p>The car ride home feels private, which is exactly why adults often overload it. A child gets into the car after school, practice, or a game, and the adult immediately starts asking, teaching, correcting, processing, or trying to cheer them up.</p>
            <p>Sometimes that works. Often it is too much.</p>
            <p>The ride home is a transition space. If you use it like an interrogation room, the child learns to brace the moment the door closes.</p>
            <h3>What adults often do wrong</h3>
            <ul>
                <li>ask five questions before the child has even buckled</li>
                <li>correct attitude before the child has decompressed</li>
                <li>turn the ride into a post-game performance review</li>
                <li>force conversation because silence feels awkward</li>
                <li>download adult stress into the drive</li>
            </ul>
            <p>In blended families, the ride home may also carry extra emotional weight if the child is moving between households or relational contexts.</p>
            <h3>Use a three-part rhythm</h3>
            <p><strong>Part one: arrival.</strong><br>Start with something simple and regulating. Water. Snack. Quiet greeting. "Glad you're here."</p>
            <p><strong>Part two: space.</strong><br>Let a few minutes be easy. Music. Silence. One light question if the child seems open.</p>
            <p><strong>Part three: follow the opening that is actually there.</strong><br>If the child starts talking, listen more than you fix. If they do not, let the ride stay plain.</p>
            <h3>Questions that help more than they corner</h3>
            <ul>
                <li>"Do you want quiet or do you want company?"</li>
                <li>"Was today more tiring or more frustrating?"</li>
                <li>"Do you want advice, or do you just want me to hear it?"</li>
            </ul>
            <p>Those questions give the child agency. Agency lowers defensiveness.</p>
            <h3>When not to process</h3>
            <p>If the child is flooded, ashamed, exhausted, or coming off a public disappointment, do not force a deep conversation in the car just because you finally have them alone. Some talks do better after food, water, and ten minutes at home.</p>
            <h3>What step-parents especially need to remember</h3>
            <p>If your relationship with the child is still building, the ride home may not be the place to push intimacy. Side-by-side presence can do a lot. A child often trusts the adult who can be with them without requiring them to perform connection on command.</p>
            <h3>If correction is necessary</h3>
            <p>Keep it short. "We need to talk later about how you spoke before you got in the car, but this is not the moment." That preserves the boundary without making the ride itself the battlefield.</p>
            <h3>The deeper principle</h3>
            <p>The ride home is a bridge, not a test. Children do better when the adults treat transitions as places to lower pressure rather than extract information. A calmer car ride often prevents a more chaotic evening.</p>
            <p>Sometimes the kindest thing an adult can offer is not a brilliant question. It is a steady presence and a little room for the child to come back to themselves before the rest of the day begins again.</p>
            """
        ),
    },
    {
        "title": "Special Days Without Pressure: Birthdays, Recitals, and Holidays in a Blended Family",
        "slug": "special-days-without-pressure",
        "excerpt": "Special days become heavy fast when adults load them with meaning, loyalty, and expectations. Here is how to make them gentler and more workable.",
        "meta_description": "A specific blended-family guide for birthdays, recitals, and holidays that keeps special days from becoming emotional pressure cookers.",
        "tags": ["co-parenting", "stepparenting"],
        "html": dedent_html(
            """
            <p>Special days carry extra hope, which is one reason they so often disappoint blended families. Adults want the birthday to feel warm. They want the recital photo to be easy. They want the holiday to prove that the family is finally working.</p>
            <p>That is a lot of pressure to put on one day.</p>
            <p>Children feel that pressure even when nobody says it out loud. The result is often more tension, not less.</p>
            <h3>Why special days get emotionally overloaded</h3>
            <ul>
                <li>the adults want a symbolic win</li>
                <li>different households hold different traditions</li>
                <li>children feel pulled between loyalties</li>
                <li>unspoken expectations collide in public</li>
                <li>old grief comes closer to the surface</li>
            </ul>
            <p>When adults do not plan for those pressures, they tend to interpret them as personal failure.</p>
            <h3>Lower the symbolic weight</h3>
            <p>A birthday does not need to heal the whole family system. A recital does not need to prove that everybody is mature. A holiday meal does not need to feel magical in order to count as good.</p>
            <p>When the day is allowed to be ordinary enough, people usually breathe easier inside it.</p>
            <h3>Choose one clear purpose for the event</h3>
            <p>Ask: what is this day mainly for?</p>
            <ul>
                <li>celebrating the child</li>
                <li>marking a milestone</li>
                <li>keeping a simple tradition</li>
                <li>sharing a brief meal without drama</li>
            </ul>
            <p>If you try to make one day do five emotional jobs at once, it will probably collapse under the weight.</p>
            <h3>What helps children most</h3>
            <ul>
                <li>clear logistics ahead of time</li>
                <li>low-pressure greetings</li>
                <li>permission not to perform emotional unity</li>
                <li>adults who do not use the child as an audience for tension</li>
                <li>simple rituals that are easy to repeat</li>
            </ul>
            <p>Children usually enjoy special days more when they are not also managing the adults.</p>
            <h3>What step-parents can offer</h3>
            <p>A step-parent does not need to claim center stage on every special day. Often the deeper gift is steadiness: helping with setup, keeping tone clean, noticing the child's cues, and refusing to compete for emotional position.</p>
            <p>That is not small. It is often what makes the day workable.</p>
            <h3>Plan for the transition points</h3>
            <p>Special days rarely blow up in the middle of cake. They blow up in transition points: arrival, seating, gift-opening, departure, and the ride home. Make those moments simpler on purpose.</p>
            <h3>A useful question for the adults</h3>
            <p>"What would make this day feel lighter for the child?"</p>
            <p>That question is better than, "How do we make this look good?" It shifts the whole tone of planning.</p>
            <h3>The deeper principle</h3>
            <p>Special days become safer when adults stop using them as evidence. The goal is not to prove the family is healed. The goal is to help the child experience joy or celebration without so much emotional static around it.</p>
            <p>When that becomes the focus, birthdays, recitals, and holidays often get simpler. And simpler is usually kinder.</p>
            """
        ),
    },
]

# Keep the live publish set to the first ten specific educational posts.
POSTS = POSTS[:10]


def sql_escape(value: str | None) -> str:
    if value is None:
        return "NULL"
    return "'" + (
        value.replace("\\", "\\\\")
        .replace("'", "\\'")
        .replace("\x00", "\\0")
        .replace("\n", "\\n")
        .replace("\r", "\\r")
        .replace("\x1a", "\\Z")
    ) + "'"


def random_id() -> str:
    return uuid.uuid4().hex[:24]


def build_plaintext(html_body: str) -> str:
    parser = PlaintextExtractor()
    parser.feed(html_body)
    return parser.get_text()


def run_query(sql: str) -> str:
    result = subprocess.run(
        [
            "docker",
            "exec",
            "-i",
            DB_CONTAINER,
            "mariadb",
            "-N",
            "-B",
            f"-u{DB_USER}",
            f"-p{DB_PASSWORD}",
            DB_NAME,
        ],
        input=sql.encode(),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if result.returncode != 0:
        sys.stderr.write(result.stderr.decode())
        raise SystemExit(result.returncode)
    return result.stdout.decode().strip()


def post_id_for_slug(slug: str) -> str | None:
    output = run_query(f"SELECT id FROM posts WHERE slug={sql_escape(slug)} LIMIT 1;\n")
    return output.splitlines()[0].strip() if output else None


def posts_meta_id(post_id: str) -> str | None:
    output = run_query(f"SELECT id FROM posts_meta WHERE post_id={sql_escape(post_id)} LIMIT 1;\n")
    return output.splitlines()[0].strip() if output else None


def build_upsert_sql() -> str:
    now = dt.datetime.now(dt.timezone.utc).replace(tzinfo=None, microsecond=0)
    statements = ["START TRANSACTION;"]

    for index, post in enumerate(POSTS):
        post_id = post_id_for_slug(post["slug"]) or random_id()
        post_uuid = str(uuid.uuid4())
        meta_id = posts_meta_id(post_id) or random_id()

        published_at = now - dt.timedelta(minutes=(len(POSTS) - index))
        published_at_sql = published_at.strftime("%Y-%m-%d %H:%M:%S")

        html_body = post["html"]
        plaintext = build_plaintext(html_body)
        meta_title = f"{post['title']} | {SITE_TITLE}"

        statements.append(
            f"""
            INSERT INTO posts (
                id, uuid, title, slug, mobiledoc, lexical, html, comment_id, plaintext,
                feature_image, featured, type, status, locale, visibility,
                email_recipient_filter, created_at, updated_at, published_at, published_by,
                custom_excerpt, codeinjection_head, codeinjection_foot, custom_template,
                canonical_url, newsletter_id, show_title_and_feature_image
            ) VALUES (
                {sql_escape(post_id)}, {sql_escape(post_uuid)}, {sql_escape(post['title'])}, {sql_escape(post['slug'])},
                NULL, NULL, {sql_escape(html_body)}, NULL, {sql_escape(plaintext)},
                NULL, 0, 'post', 'published', NULL, 'public',
                'all', {sql_escape(published_at_sql)}, {sql_escape(published_at_sql)}, {sql_escape(published_at_sql)}, {sql_escape(AUTHOR_ID)},
                {sql_escape(post['excerpt'])}, NULL, NULL, NULL,
                NULL, {sql_escape(NEWSLETTER_ID)}, 1
            )
            ON DUPLICATE KEY UPDATE
                title=VALUES(title),
                slug=VALUES(slug),
                html=VALUES(html),
                plaintext=VALUES(plaintext),
                status='published',
                type='post',
                visibility='public',
                email_recipient_filter='all',
                updated_at=VALUES(updated_at),
                published_at=VALUES(published_at),
                published_by=VALUES(published_by),
                custom_excerpt=VALUES(custom_excerpt),
                newsletter_id=VALUES(newsletter_id),
                show_title_and_feature_image=1;
            """
        )

        statements.append(
            f"""
            INSERT INTO posts_meta (
                id, post_id, og_image, og_title, og_description, twitter_image, twitter_title,
                twitter_description, meta_title, meta_description, email_subject, frontmatter,
                feature_image_alt, feature_image_caption, email_only
            ) VALUES (
                {sql_escape(meta_id)}, {sql_escape(post_id)}, NULL, NULL, NULL, NULL, NULL,
                NULL, {sql_escape(meta_title)}, {sql_escape(post['meta_description'])}, NULL, NULL,
                NULL, NULL, 0
            )
            ON DUPLICATE KEY UPDATE
                meta_title=VALUES(meta_title),
                meta_description=VALUES(meta_description),
                email_only=0;
            """
        )

        statements.append(f"DELETE FROM posts_authors WHERE post_id={sql_escape(post_id)};\n")
        statements.append(
            f"""
            INSERT INTO posts_authors (id, post_id, author_id, sort_order) VALUES
            ({sql_escape(random_id())}, {sql_escape(post_id)}, {sql_escape(AUTHOR_ID)}, 0);
            """
        )

        statements.append(f"DELETE FROM posts_tags WHERE post_id={sql_escape(post_id)};\n")
        for sort_order, tag_slug in enumerate(post["tags"]):
            tag_id = TAG_IDS[tag_slug]
            statements.append(
                f"""
                INSERT INTO posts_tags (id, post_id, tag_id, sort_order) VALUES
                ({sql_escape(random_id())}, {sql_escape(post_id)}, {sql_escape(tag_id)}, {sort_order});
                """
            )

    statements.append("COMMIT;")
    return "\n".join(statements)


def main() -> None:
    sql = build_upsert_sql()
    run_query(sql)
    slugs = ", ".join(post["slug"] for post in POSTS)
    print(f"Published or updated {len(POSTS)} posts: {slugs}")
    print(json.dumps([{"slug": post["slug"], "title": post["title"]} for post in POSTS], indent=2))


if __name__ == "__main__":
    main()
