import crypto from 'crypto';
import express from 'express';
import mongoose from 'mongoose';
import AnalyticsEvent from '../models/AnalyticsEvent.js';
import Business from '../models/Business.js';
import { protectAdmin } from '../middleware/auth.js';
import { assertAllowedFields, requireString } from '../middleware/security.js';

const router = express.Router();

const EVENT_TYPES = new Set(['page_view', 'cta_click']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_DAYS = 90;

const hashSession = (sessionId) =>
  crypto.createHmac('sha256', process.env.APP_ENCRYPTION_KEY).update(sessionId).digest('hex');

const cleanOptional = (value, field, max) => {
  if (value == null || value === '') return undefined;
  return requireString(value, field, { max });
};

const classifyUserAgent = (userAgent = '') => {
  const ua = userAgent.toLowerCase();
  if (!ua) return 'unknown';
  if (/bot|crawler|spider|slurp|bingpreview|facebookexternalhit|headless/i.test(ua)) return 'bot';
  if (/tablet|ipad|android(?!.*mobile)/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android/i.test(ua)) return 'mobile';
  return 'desktop';
};

const trustedGeo = (req) => {
  if (process.env.ANALYTICS_GEO_HEADERS !== 'true') return {};
  const provider = (process.env.ANALYTICS_GEO_PROVIDER || '').toLowerCase();
  if (provider === 'vercel') {
    return {
      city: cleanGeo(req.get('x-vercel-ip-city')),
      region: cleanGeo(req.get('x-vercel-ip-country-region')),
      country: cleanGeo(req.get('x-vercel-ip-country')),
    };
  }
  if (provider === 'cloudflare') {
    return { country: cleanGeo(req.get('cf-ipcountry')) };
  }
  return {};
};

const cleanGeo = (value) => {
  if (!value) return undefined;
  const decoded = decodeURIComponent(String(value)).trim();
  return decoded.length > 120 ? decoded.slice(0, 120) : decoded;
};

const parseDays = (value) => {
  const days = Number.parseInt(value, 10);
  if (!Number.isInteger(days) || days < 1) return 30;
  return Math.min(MAX_DAYS, days);
};

router.post('/event', async (req, res, next) => {
  try {
    assertAllowedFields(req.body, [
      'businessSlug',
      'eventId',
      'type',
      'sessionId',
      'path',
      'action',
      'label',
      'referrer',
    ]);

    const businessSlug = requireString(req.body.businessSlug, 'businessSlug', { max: 120 }).toLowerCase();
    const eventId = requireString(req.body.eventId, 'eventId', { max: 64 });
    const sessionId = requireString(req.body.sessionId, 'sessionId', { min: 16, max: 128 });
    const type = requireString(req.body.type, 'type', { max: 30 });
    const path = requireString(req.body.path, 'path', { max: 500 });

    if (!UUID_RE.test(eventId)) {
      return res.status(400).json({ success: false, message: 'Invalid eventId' });
    }
    if (!UUID_RE.test(sessionId)) {
      return res.status(400).json({ success: false, message: 'Invalid sessionId' });
    }
    if (!EVENT_TYPES.has(type)) {
      return res.status(400).json({ success: false, message: 'Invalid analytics event type' });
    }
    if (!path.startsWith('/') || path.includes('://')) {
      return res.status(400).json({ success: false, message: 'Invalid path' });
    }
    if (type === 'cta_click' && !req.body.action) {
      return res.status(400).json({ success: false, message: 'CTA action is required' });
    }

    const business = await Business.findOne({ businessSlug, isActive: true }).select('_id');
    if (!business) return res.status(404).json({ success: false, message: 'Business not found' });

    const geo = trustedGeo(req);
    const event = {
      businessId: business._id,
      eventId,
      type,
      sessionHash: hashSession(sessionId),
      path,
      action: cleanOptional(req.body.action, 'action', 80),
      label: cleanOptional(req.body.label, 'label', 160),
      referrer: cleanOptional(req.body.referrer, 'referrer', 500),
      ...geo,
      userAgentClass: classifyUserAgent(req.get('user-agent')),
      occurredAt: new Date(),
    };

    try {
      await AnalyticsEvent.create(event);
    } catch (error) {
      if (error?.code === 11000) {
        return res.status(202).json({ success: true, duplicate: true });
      }
      throw error;
    }

    return res.status(202).json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.get('/summary', protectAdmin, async (req, res, next) => {
  try {
    const days = parseDays(req.query.days);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const businessId = new mongoose.Types.ObjectId(req.businessId);

    const [overview, daily, pages, ctas, geo, devices] = await Promise.all([
      AnalyticsEvent.aggregate([
        { $match: { businessId, occurredAt: { $gte: since }, userAgentClass: { $ne: 'bot' } } },
        {
          $group: {
            _id: null,
            pageviews: { $sum: { $cond: [{ $eq: ['$type', 'page_view'] }, 1, 0] } },
            sessions: { $addToSet: '$sessionHash' },
          },
        },
        {
          $project: {
            _id: 0,
            pageviews: 1,
            sessions: { $size: '$sessions' },
          },
        },
      ]),
      AnalyticsEvent.aggregate([
        { $match: { businessId, occurredAt: { $gte: since }, userAgentClass: { $ne: 'bot' } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$occurredAt', timezone: 'Asia/Karachi' } },
            pageviews: { $sum: { $cond: [{ $eq: ['$type', 'page_view'] }, 1, 0] } },
            sessions: { $addToSet: '$sessionHash' },
          },
        },
        { $project: { _id: 0, date: '$_id', pageviews: 1, sessions: { $size: '$sessions' } } },
        { $sort: { date: 1 } },
      ]),
      AnalyticsEvent.aggregate([
        { $match: { businessId, occurredAt: { $gte: since }, type: 'page_view', userAgentClass: { $ne: 'bot' } } },
        { $group: { _id: '$path', pageviews: { $sum: 1 }, sessions: { $addToSet: '$sessionHash' } } },
        { $project: { _id: 0, path: '$_id', pageviews: 1, sessions: { $size: '$sessions' } } },
        { $sort: { pageviews: -1 } },
        { $limit: 20 },
      ]),
      AnalyticsEvent.aggregate([
        { $match: { businessId, occurredAt: { $gte: since }, type: 'cta_click', userAgentClass: { $ne: 'bot' } } },
        { $group: { _id: { action: '$action', label: '$label' }, clicks: { $sum: 1 } } },
        { $project: { _id: 0, action: '$_id.action', label: '$_id.label', clicks: 1 } },
        { $sort: { clicks: -1 } },
        { $limit: 20 },
      ]),
      AnalyticsEvent.aggregate([
        { $match: { businessId, occurredAt: { $gte: since }, userAgentClass: { $ne: 'bot' }, $or: [{ city: { $exists: true } }, { country: { $exists: true } }] } },
        { $group: { _id: { city: '$city', region: '$region', country: '$country' }, visits: { $addToSet: '$sessionHash' } } },
        { $project: { _id: 0, city: '$_id.city', region: '$_id.region', country: '$_id.country', visits: { $size: '$visits' } } },
        { $sort: { visits: -1 } },
        { $limit: 20 },
      ]),
      AnalyticsEvent.aggregate([
        { $match: { businessId, occurredAt: { $gte: since }, userAgentClass: { $ne: 'bot' } } },
        { $group: { _id: '$userAgentClass', sessions: { $addToSet: '$sessionHash' }, pageviews: { $sum: { $cond: [{ $eq: ['$type', 'page_view'] }, 1, 0] } } } },
        { $project: { _id: 0, device: '$_id', sessions: { $size: '$sessions' }, pageviews: 1 } },
        { $sort: { sessions: -1 } },
      ]),
    ]);

    const first = overview[0] || { pageviews: 0, sessions: 0 };
    res.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=120');
    return res.json({
      success: true,
      days,
      overview: { pageviews: first.pageviews, sessions: first.sessions, visits: first.sessions },
      daily,
      pages,
      ctas,
      geo,
      devices,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
