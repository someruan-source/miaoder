'use server'

import { redirect } from 'next/navigation'
import { updateProfileAction } from '@/lib/actions/profile'
import { createPetAction } from '@/lib/actions/pets'

export interface OnboardingState {
  ok: boolean
  step?: 'profile' | 'pet' | 'form'
  formError?: string
  fieldErrors?: Record<string, string[] | undefined>
}

export async function completeOnboardingAction(
  _prevState: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const nickname = String(formData.get('nickname') ?? '')
  const city = String(formData.get('city') ?? '')
  const bio = String(formData.get('bio') ?? '')

  const profileFormData = new FormData()
  profileFormData.set('nickname', nickname)
  profileFormData.set('city', city)
  profileFormData.set('bio', bio)

  const profileResult = await updateProfileAction(profileFormData)
  if (!profileResult.ok) {
    return {
      ok: false,
      step: 'profile',
      formError: profileResult.formError,
      fieldErrors: profileResult.fieldErrors,
    }
  }

  const personalityTags = formData.getAll('personality_tags').map(String)
  const activityTags = formData.getAll('activity_tags').map(String)

  const petResult = await createPetAction({
    name: String(formData.get('pet_name') ?? ''),
    type: String(formData.get('pet_type') ?? 'cat') as 'cat' | 'dog' | 'other',
    breed: String(formData.get('breed') ?? ''),
    gender: String(formData.get('gender') ?? 'unknown') as 'male' | 'female' | 'unknown',
    age_months: formData.get('age_months') ? Number(formData.get('age_months')) : undefined,
    size: formData.get('size')
      ? (String(formData.get('size')) as 'small' | 'medium' | 'large')
      : undefined,
    neutered: formData.get('neutered') === 'on',
    vaccinated: formData.get('vaccinated') === 'on',
    friendly_to_humans: formData.get('friendly_to_humans') === 'on',
    friendly_to_pets: formData.get('friendly_to_pets') === 'on',
    meetup_ready: formData.get('meetup_ready') === 'on',
    intro: String(formData.get('pet_intro') ?? ''),
    city,
    district: String(formData.get('district') ?? ''),
    personality_tags: personalityTags,
    activity_tags: activityTags,
  })

  if (!petResult.ok) {
    return {
      ok: false,
      step: 'pet',
      formError: petResult.formError,
      fieldErrors: petResult.fieldErrors,
    }
  }

  redirect('/')
}
