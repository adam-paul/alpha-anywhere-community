# Email: AlphaLearn Course Builder Handoff

**Date:** 2025-12-06 → 2025-12-31 (thread)  
**Subject:** Re: Keys and AlphaLearn  
**Participants:** Amanda Shipka, Itamar Goldminz, Nils Lang, Elpidio Julian, Patrick Skinner, Anthony Harley (former), Silas (former), Abraham (former)

---

## Latest: Amanda (Dec 31, 2025)

Sounds great! I'll book something.

---

## Nils Lang (Dec 31, 2025)

Thanks Itamar.

Hi Amanda, I have PTO until Monday. We can meet then, would like @Elpidio Julian to also attend. We can demo what we have built so far.

As usual 9am - 9pm CET works.

---

## Amanda Shipka (Dec 31, 2025)

Hi Itamar - Ok thank you for the update.

@Nils Lang sounds like we should meet again on this topic!

Let me know your availability so I can bring you up to speed.

---

## Itamar Goldminz (Dec 31, 2025)

Hi Amanda,

Apologies for the delay. Earlier this month we parted ways with both Silas and Anthony.

Elpidio is now the lead engineer on the AlphaLearn course builder project, and Nils is the PM.
I have the utmost trust in this team's ability to deliver.
I'll let the two of them take it from here.

---

## Amanda Shipka (Dec 29, 2025)

Hi Anthony and Silas - just checking in if you're still working on this? Please let me know - there are people asking for things in the AlphaLearn course builder and I'd prefer not to work on it if you are building out the platform product.

---

## Amanda Shipka (Dec 22, 2025)

Hey Anthony - how is it going on this project? Making any progress? I'd love an update! Let me know if i can help in any way.

---

## Anthony Harley (Dec 9, 2025)

Heads up, Abraham is on another project now and Silas is working with me on this one.

I got the secrets, thank you. Thanks for the feedback.

We aren't planning on making a standalone renderer for the MVP. We'll either use the existing one or another out the box option for rapid development.

---

## Amanda Shipka (Dec 9, 2025)

Are you planning on creating a platform renderer as well?

---

## Amanda Shipka (Dec 8, 2025)

Hi Anthony,

I just sent you both access to a google drive with the secrets.

1. Incept is contributing because they are customizing AlphaLearn for their student experience needs. they have their own separate systems outside of AlphaLearn for everything related to generation etc. You'll need to create your own separate deployment, even if you do choose to use the existing Django codebase, so it's totally up to you. The only advantage of the Django codebase is that it already has a lot of the endpoints pre-written

2. Yea - the ability to duplicate/fork a course. There have been a few instances where this would be helpful. Low priority, but definitely nice to have.

3. While technically possible, the navigation becomes a bit tiresome and complex when there is more than course>lesson>activity. I'd suggest starting with only this at first.

---

## Anthony Harley (Dec 6, 2025)

We know it's the weekend so no pressure, but when you have time if you can get us the AlphaLearn keys that would be great!

Also setting Abraham as an admin in AlphaLearn would help see what's there if you guys haven't done that already.

Additionally have a few questions if you could respond to them.

1. Going over the AlphaLearn backend, curious if it's used for anything else besides AlphaLearn. I saw incept contributing to the repo too and am wondering if it would be smart to use it or not. Currently we're planning on using a Timeback temple we were using that has auth and everything already implemented and uses AppSync auto generated from Amplify. Curious if there's any strategic advantages you see from using the current Django setup.

2. Some parts of the spec sounded like you were implying users can fork courses. Is this something you thought of or came up with academics?

3. Core hierarchy is listed as:
    ```
    Core Hierarchy (Timeback Course Architecture)
    Course
    → Unit (Component)
    → Lesson (Nested Component)
    → Activity (Resource)
    → QTI Item(s)
    Metadata and relationships flow downward through this hierarchy.
    ```
    and I'm curious if this shouldn't leave room for the recursive ability to make sub-units, etc.
