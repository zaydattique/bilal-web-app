import express from 'express';
import slugify from 'slugify';
import Category from '../models/Category.js';
import { protectAdmin, requireRole, optionalAuth } from '../middleware/auth.js';
import { logAction } from '../utils/audit.js';
import { assertAllowedFields, requireObjectId, resolvePublicBusiness } from '../middleware/security.js';
import { resolveSingleMediaId } from '../utils/mediaReferences.js';

const router = express.Router();
const FIELDS = ['name','slug','description','image','order','status','customFields','faqs','seo','aeo','geo'];

const getBusinessId = async (req) => {
  if (req.businessId) return req.businessId;
  const business = await resolvePublicBusiness(req.query.businessId);
  return business._id;
};

const populate = (query) => query.populate('image', 'publicUrl altText width height purpose');

const normalizeFaqs = (value) => {
  if (!Array.isArray(value) || value.length > 20) throw Object.assign(new Error('faqs is invalid'), { statusCode: 400 });
  return value.map((faq) => {
    if (!faq || typeof faq.question !== 'string' || typeof faq.answer !== 'string') throw Object.assign(new Error('Each FAQ needs a question and answer'), { statusCode: 400 });
    return { question: faq.question.trim().slice(0,300), answer: faq.answer.trim().slice(0,2000) };
  });
};

const normalizeCustomFields = (value) => {
  if (!Array.isArray(value) || value.length > 30) throw Object.assign(new Error('customFields is invalid'), { statusCode: 400 });
  const keys = new Set();
  return value.map((field) => {
    if (!field || typeof field.key !== 'string' || typeof field.label !== 'string' || !['text','number','date','select'].includes(field.type)) {
      throw Object.assign(new Error('Each custom field needs key, label and supported type'), { statusCode: 400 });
    }
    const key = slugify(field.key, { lower: true, strict: true }).slice(0,80);
    if (!key || keys.has(key)) throw Object.assign(new Error('Custom field keys must be unique'), { statusCode: 400 });
    keys.add(key);
    const options = Array.isArray(field.options) ? field.options.map((v) => String(v).trim()).filter(Boolean).slice(0,50) : [];
    if (field.type === 'select' && options.length === 0) throw Object.assign(new Error(`Select field ${key} needs options`), { statusCode: 400 });
    return { key, label: field.label.trim().slice(0,120), type: field.type, required: field.required === true, options };
  });
};

const validatePublish = (data) => {
  if (data.status !== 'published') return;
  const missing = [];
  if (!data.name || !data.description) missing.push('description');
  if (!data.seo?.title || !data.seo?.description) missing.push('SEO title and description');
  if (!data.aeo?.summary) missing.push('AEO summary');
  if (missing.length) throw Object.assign(new Error(`Cannot publish: missing ${missing.join(', ')}`), { statusCode: 400 });
};

router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const businessId = await getBusinessId(req);
    const filter = { businessId };
    if (!req.admin) filter.status = 'published';
    else if (req.query.status) filter.status = String(req.query.status);
    const categories = await populate(Category.find(filter).sort({ order: 1, name: 1 }));
    res.json({ success: true, categories });
  } catch (error) { next(error); }
});

router.get('/:idOrSlug', optionalAuth, async (req, res, next) => {
  try {
    const businessId = await getBusinessId(req);
    const value = String(req.params.idOrSlug).toLowerCase();
    const filter = { businessId };
    if (!req.admin) filter.status = 'published';
    if (/^[0-9a-f]{24}$/i.test(value)) filter._id = requireObjectId(value, 'category id');
    else filter.slug = value;
    const category = await populate(Category.findOne(filter));
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, category });
  } catch (error) { next(error); }
});

router.post('/', protectAdmin, requireRole('super_admin','admin','manager'), async (req,res,next)=>{
  try {
    assertAllowedFields(req.body, FIELDS);
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ success:false, message:'Name is required' });
    const slug = slugify(req.body.slug || name, { lower:true, strict:true }).slice(0,160);
    if (!slug) return res.status(400).json({ success:false, message:'Invalid slug' });
    const exists = await Category.exists({ businessId:req.businessId, slug });
    if (exists) return res.status(409).json({ success:false, message:'Category slug already exists' });
    const data = {
      businessId:req.businessId, name:name.slice(0,120), slug,
      description:String(req.body.description || '').trim().slice(0,2000),
      image:await resolveSingleMediaId(req.body.image, req.businessId, 'image'),
      order:Math.max(0, Math.min(100000, Number(req.body.order) || 0)),
      status:req.body.status || 'draft',
      customFields:normalizeCustomFields(req.body.customFields || []),
      faqs:normalizeFaqs(req.body.faqs || []),
      seo:req.body.seo || {}, aeo:req.body.aeo || {}, geo:req.body.geo || {},
    };
    validatePublish(data);
    const category=await Category.create(data);
    await logAction({businessId:req.businessId,adminId:req.admin._id,action:'create',entityType:'category',entityId:category._id,ipAddress:req.ip,userAgent:req.get('user-agent')});
    res.status(201).json({success:true,category:await populate(Category.findById(category._id))});
  } catch(error){next(error);}
});

router.put('/:id', protectAdmin, requireRole('super_admin','admin','manager'), async (req,res,next)=>{
  try {
    assertAllowedFields(req.body,FIELDS);
    const id=requireObjectId(req.params.id,'category id');
    const category=await Category.findOne({_id:id,businessId:req.businessId});
    if(!category) return res.status(404).json({success:false,message:'Category not found'});
    const next={...req.body};
    if(next.name!==undefined) next.name=String(next.name).trim().slice(0,120);
    if(next.slug!==undefined || next.name!==undefined) next.slug=slugify(next.slug || next.name,{lower:true,strict:true}).slice(0,160);
    if(next.image!==undefined) next.image=await resolveSingleMediaId(next.image,req.businessId,'image');
    if(next.customFields!==undefined) next.customFields=normalizeCustomFields(next.customFields);
    if(next.faqs!==undefined) next.faqs=normalizeFaqs(next.faqs);
    if(next.order!==undefined) next.order=Math.max(0,Math.min(100000,Number(next.order)||0));
    Object.assign(category,next);
    validatePublish(category.toObject());
    if(category.slug!==undefined){
      const duplicate=await Category.exists({businessId:req.businessId,slug:category.slug,_id:{$ne:id}});
      if(duplicate) return res.status(409).json({success:false,message:'Category slug already exists'});
    }
    await category.save();
    await logAction({businessId:req.businessId,adminId:req.admin._id,action:'update',entityType:'category',entityId:id,ipAddress:req.ip,userAgent:req.get('user-agent')});
    res.json({success:true,category:await populate(Category.findById(id))});
  }catch(error){next(error);}
});

router.delete('/:id',protectAdmin,requireRole('super_admin','admin'),async(req,res,next)=>{
  try{
    const category=await Category.findOneAndUpdate({_id:requireObjectId(req.params.id,'category id'),businessId:req.businessId},{status:'archived'},{new:true});
    if(!category)return res.status(404).json({success:false,message:'Category not found'});
    await logAction({businessId:req.businessId,adminId:req.admin._id,action:'archive',entityType:'category',entityId:category._id,ipAddress:req.ip,userAgent:req.get('user-agent')});
    res.json({success:true,category});
  }catch(error){next(error);}
});

export default router;
