from flask import Blueprint, request, jsonify
from app.models import db, World, Chapter, ConversationMessage, NovelRecord, UserWorld, WorldCharacter, User
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

db_bp = Blueprint('db', __name__, url_prefix='/api/db')

# 1. 获取全部的World信息
@db_bp.route('/worlds', methods=['GET'])
def get_all_worlds():
    try:
        worlds = World.query.all()
        result = []
        for world in worlds:
            # 获取世界角色
            characters = [
                {
                    'name': c.name,
                    'background': c.background
                } for c in world.characters
            ]
            
            result.append({
                'id': world.id,
                'user_id': world.user_id,
                'name': world.name,
                'tags': world.tags,
                'is_public': world.is_public,
                'worldview': world.worldview,
                'master_setting': world.master_setting,
                'main_characters': characters,
                'origin_world_id': world.origin_world_id,
                'create_time': world.create_time.isoformat(),
                'popularity': world.popularity
            })
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# 2. 获取指定World和creator_user_id对应的全部Chapter信息
@db_bp.route('/worlds/<int:world_id>/chapters', methods=['GET'])
def get_chapters_by_world_and_creator(world_id):
    try:
        creator_user_id = request.args.get('creator_user_id', type=int)
        if not creator_user_id:
            return jsonify({'error': '缺少creator_user_id参数'}), 400
            
        chapters = Chapter.query.filter_by(
            world_id=world_id,
            creator_user_id=creator_user_id
        ).all()
        
        result = [
            {
                'id': chapter.id,
                'world_id': chapter.world_id,
                'creator_user_id': chapter.creator_user_id,
                'name': chapter.name,
                'opening': chapter.opening,
                'background': chapter.background,
                'is_default': chapter.is_default,
                'origin_chapter_id': chapter.origin_chapter_id,
                'create_time': chapter.create_time.isoformat()
            } for chapter in chapters
        ]
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# 3. 获取指定chapter_id对应的全部ConversationMessage信息
@db_bp.route('/chapters/<int:chapter_id>/messages', methods=['GET'])
def get_messages_by_chapter(chapter_id):
    try:
        messages = ConversationMessage.query.filter_by(chapter_id=chapter_id).order_by(
            ConversationMessage.create_time
        ).all()
        
        result = [
            {
                'id': msg.id,
                'chapter_id': msg.chapter_id,
                'user_id': msg.user_id,
                'role': msg.role,
                'content': msg.content,
                'create_time': msg.create_time.isoformat()
            } for msg in messages
        ]
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# 4. 获取指定chapter_id对应的全部NovelRecord信息
@db_bp.route('/chapters/<int:chapter_id>/novels', methods=['GET'])
def get_novels_by_chapter(chapter_id):
    try:
        novels = NovelRecord.query.filter_by(chapter_id=chapter_id).order_by(
            NovelRecord.create_time.desc()
        ).all()
        
        result = [
            {
                'id': novel.id,
                'chapter_id': novel.chapter_id,
                'user_id': novel.user_id,
                'title': novel.title,
                'content': novel.content,
                'create_time': novel.create_time.isoformat()
            } for novel in novels
        ]
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# 5. 获取指定user_id和role对应的全部UserWorld信息
@db_bp.route('/user-worlds', methods=['GET'])
def get_user_worlds_by_user_and_role():
    try:
        user_id = request.args.get('user_id', type=int)
        role = request.args.get('role')
        
        if not user_id or not role:
            return jsonify({'error': '缺少user_id或role参数'}), 400
            
        if role not in ['creator', 'participant', 'viewer']:
            return jsonify({'error': '无效的role值'}), 400
            
        user_worlds = UserWorld.query.filter_by(
            user_id=user_id,
            role=role
        ).all()
        
        result = [
            {
                'id': uw.id,
                'user_id': uw.user_id,
                'world_id': uw.world_id,
                'role': uw.role,
                'create_time': uw.create_time.isoformat()
            } for uw in user_worlds
        ]
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# 6. 注册或登录（POST）
@db_bp.route('/auth', methods=['POST'])
def register_or_login():
    try:
        data = request.get_json(silent=True) or request.form
        username = data.get('username')
        password = data.get('password')

        if not username or not password:
            return jsonify({'error': '缺少username或password参数'}), 400

        user = User.query.filter_by(username=username).first()

        if user is None:
            hashed = generate_password_hash(password)
            user = User(username=username, password=hashed)
            db.session.add(user)
            db.session.commit()
            return jsonify({'user_id': user.id}), 201
        else:
            if check_password_hash(user.password, password):
                return jsonify({'user_id': user.id}), 200
            else:
                return jsonify({'error': '密码错误'}), 401
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500