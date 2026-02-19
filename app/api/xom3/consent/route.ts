import { NextRequest, NextResponse } from 'next/server';
import { ConsentProfile } from '../../../../lib/xom3/types';
import ConsentManager from '../../../../lib/xom3/consent-manager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { profileId, domain, consentCategories, visitorId } = body;

    if (!profileId || !domain || !visitorId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: profileId, domain, visitorId' },
        { status: 400 }
      );
    }

    const manager = ConsentManager.getInstance();

    // Get default categories and update with provided consent
    const defaultCategories = manager.getDefaultCategories();
    const updatedCategories = defaultCategories.map(cat => ({
      ...cat,
      granted: consentCategories?.includes(cat.id) ?? cat.required
    }));

    const profile = await manager.updateProfile(profileId, {
      domain,
      visitorId,
      consentGiven: true,
      consentTimestamp: new Date(),
      consentCategories: updatedCategories,
      dataRetention: {
        duration: 365,
        categories: consentCategories || [],
        autoDelete: true
      },
      jurisdiction: body.jurisdiction || 'UNKNOWN',
      lastUpdated: new Date()
    });

    return NextResponse.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Consent update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update consent' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get('profileId');

    if (!profileId) {
      return NextResponse.json(
        { success: false, error: 'profileId parameter required' },
        { status: 400 }
      );
    }

    const manager = ConsentManager.getInstance();
    const profile = manager.getProfile(profileId);

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Consent fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch consent profile' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get('profileId');

    if (!profileId) {
      return NextResponse.json(
        { success: false, error: 'profileId parameter required' },
        { status: 400 }
      );
    }

    const manager = ConsentManager.getInstance();
    await manager.revokeConsent(profileId);

    return NextResponse.json({
      success: true,
      message: 'Consent revoked successfully'
    });
  } catch (error) {
    console.error('Consent revocation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to revoke consent' },
      { status: 500 }
    );
  }
}
